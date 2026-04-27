import { useEffect, useRef, useState, useCallback } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc, setDoc, runTransaction, increment, onSnapshot, limit } from 'firebase/firestore';
import { User, GameMode, GameRound, Bet } from '../types';
import { getRoundId, generateRoundResult, calculatePayout } from '../lib/gameLogic';

interface BackgroundSettlementProps {
  user: User | null;
}

export default function BackgroundSettlement({ user }: BackgroundSettlementProps) {
  const [predictionConfigs, setPredictionConfigs] = useState<Record<string, any>>({});
  const lastRoundIds = useRef<Record<string, string>>({});
  const isSettling = useRef<Record<string, boolean>>({});

  useEffect(() => {
    if (!user) return;

    const predictionUnsubscribes = ['1min', '3min', '5min', '10min'].map(mode => 
      onSnapshot(doc(db, 'config', `prediction_${mode}`), (snapshot) => {
        if (snapshot.exists()) {
          setPredictionConfigs(prev => ({ ...prev, [mode]: snapshot.data() }));
        }
      })
    );

    return () => {
      predictionUnsubscribes.forEach(unsub => unsub());
    };
  }, [user?.id]);

  const handleRoundSettlement = useCallback(async (roundId: string, mode: GameMode) => {
    if (!user || isSettling.current[`${mode}-${roundId}`]) return;
    
    isSettling.current[`${mode}-${roundId}`] = true;
    console.log(`[Background] Settling ${mode} round ${roundId}`);

    try {
      let result = generateRoundResult(roundId);
      const predData = predictionConfigs[mode];
      if (predData) {
        if (predData.currentRoundId === roundId && predData.currentResult) {
          result = predData.currentResult;
        } else if (predData.nextRoundId === roundId && predData.nextResult) {
          result = predData.nextResult;
        }
      }

      const newRound: GameRound = {
        id: roundId,
        mode: mode,
        startTime: Date.now() - (mode === '1min' ? 60000 : mode === '3min' ? 180000 : mode === '5min' ? 300000 : 600000),
        endTime: Date.now(),
        resultColor: result.color,
        resultNumber: result.number,
        resultBigSmall: result.bigSmall,
        status: 'completed'
      };

      // Query for pending bets to settle
      // If admin, settle all. If user, settle only own.
      const betsQuery = user.role === 'admin' 
        ? query(collection(db, 'bets'), where('roundId', '==', roundId), where('status', '==', 'pending'))
        : query(collection(db, 'bets'), where('roundId', '==', roundId), where('status', '==', 'pending'), where('userId', '==', user.id));

      const querySnapshot = await getDocs(betsQuery);

      if (querySnapshot.empty) {
        // Record history even if no bets found
        const historyRef = doc(db, 'game_history', roundId);
        const historySnap = await getDoc(historyRef);
        if (!historySnap.exists()) {
          await setDoc(historyRef, newRound);
        }
      } else {
        await runTransaction(db, async (transaction) => {
          const historyRef = doc(db, 'game_history', roundId);
          const historySnap = await transaction.get(historyRef);

          // PERFORM ALL READS FIRST
          const betSnapshots = await Promise.all(
            querySnapshot.docs.map(betDoc => transaction.get(betDoc.ref))
          );

          // NOW PERFORM ALL WRITES
          if (!historySnap.exists()) {
            transaction.set(historyRef, newRound);
          }

          const userPayouts: Record<string, number> = {};

          for (const betSnap of betSnapshots) {
            if (!betSnap.exists() || betSnap.data()?.status !== 'pending') continue;

            const betData = betSnap.data() as Bet;
            const payout = calculatePayout(betData, result);
            const status = payout > 0 ? 'win' : 'loss';

            transaction.update(betSnap.ref, {
              status,
              payout,
              result: {
                number: result.number,
                color: result.color,
                bigSmall: result.bigSmall
              },
              updatedAt: Date.now()
            });

            if (payout > 0) {
              userPayouts[betData.userId] = (userPayouts[betData.userId] || 0) + payout;
            }
          }

          // Update balances for all affected users
          for (const [uId, totalPayout] of Object.entries(userPayouts)) {
            const uRef = doc(db, 'users', uId);
            transaction.update(uRef, { balance: increment(totalPayout) });
          }
        });
      }
      console.log(`[Background] Successfully settled ${mode} round ${roundId}`);
    } catch (error) {
      console.error(`[Background] Settlement failed for ${mode} ${roundId}:`, error);
    } finally {
      // Keep in isSettling for a while to avoid rapid retries if interval triggers again
      setTimeout(() => {
        delete isSettling.current[`${mode}-${roundId}`];
      }, 5000);
    }
  }, [user, predictionConfigs]);

  // Main Ticker
  useEffect(() => {
    if (!user) return;

    const modes: GameMode[] = ['1min', '3min', '5min', '10min'];
    // Init round IDs
    modes.forEach(m => {
      lastRoundIds.current[m] = getRoundId(m, Date.now());
    });

    const interval = setInterval(() => {
      const now = Date.now();
      modes.forEach(mode => {
        const newId = getRoundId(mode, now);
        if (newId !== lastRoundIds.current[mode]) {
          const oldId = lastRoundIds.current[mode];
          lastRoundIds.current[mode] = newId;
          if (oldId) {
            handleRoundSettlement(oldId, mode);
          }
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [user?.id, handleRoundSettlement]);

  // Catch-up effect for any stuck bets
  useEffect(() => {
    if (!user) return;

    // We only catch up for the current user to keep it lightweight, 
    // but Admin could catch up for everyone occasionally.
    const q = user.role === 'admin'
      ? query(collection(db, 'bets'), where('status', '==', 'pending'), limit(20))
      : query(collection(db, 'bets'), where('userId', '==', user.id), where('status', '==', 'pending'), limit(20));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const now = Date.now();
      snapshot.docs.forEach(betDoc => {
        const bet = betDoc.data() as Bet;
        const currentRoundId = getRoundId(bet.mode, now);
        if (bet.roundId < currentRoundId) {
          handleRoundSettlement(bet.roundId, bet.mode);
        }
      });
    });

    return () => unsubscribe();
  }, [user?.id, user?.role, handleRoundSettlement]);

  return null;
}
