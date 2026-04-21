import React, { useState, useEffect } from "react";
import {
  Card, CardContent, CardHeader, CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from "@/components/ui/table";
import {
  Tabs, TabsContent, TabsList, TabsTrigger
} from "@/components/ui/tabs";
import {
  ChevronLeft, Users, Wallet, TrendingUp, Settings,
  RefreshCw, ShieldCheck
} from "lucide-react";
import { toast } from "sonner";

import {
  collection, onSnapshot, query, orderBy,
  doc, getDoc, setDoc, updateDoc, deleteDoc,
  addDoc, limit, increment
} from "firebase/firestore";

import { db } from "../firebase";
import { getRoundId, generateRoundResult } from "../lib/gameLogic";

export default function AdminPanel({ onNavigate, user }) {

  const [activeTab, setActiveTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [predictionConfigs, setPredictionConfigs] = useState({});
  const [predictions, setPredictions] = useState([]);

  // ===============================
  // 🔮 SET MANUAL PREDICTION
  // ===============================
  const setManualPrediction = async (mode, roundType, number) => {
    try {
      const predRef = doc(db, "config", `prediction_${mode}`);
      const predSnap = await getDoc(predRef);
      const currentData = predSnap.exists() ? predSnap.data() : {};

      const now = Date.now();
      let roundId = getRoundId(mode, now);

      if (roundType === "next") {
        const modeMS =
          mode === "1min" ? 60000 :
          mode === "3min" ? 180000 :
          mode === "5min" ? 300000 : 600000;

        roundId = getRoundId(mode, now + modeMS);
      }

      const result = {
        number,
        color:
          number === 0 ? ["red", "violet"] :
          number === 5 ? ["green", "violet"] :
          number % 2 === 0 ? ["red"] : ["green"],
        bigSmall: number >= 5 ? "big" : "small"
      };

      await setDoc(predRef, {
        ...currentData,
        [`${roundType}RoundId`]: roundId,
        [`${roundType}Result`]: result
      }, { merge: true });

      toast.success("Prediction updated!");
    } catch (err) {
      console.error(err);
      toast.error("Prediction failed");
    }
  };

  // ===============================
  // 🔮 LIVE PREDICTIONS
  // ===============================
  useEffect(() => {
    const interval = setInterval(() => {
      const modes = ["1min", "3min", "5min", "10min"];
      const now = Date.now();

      const updated = modes.map((mode) => {
        const currentId = getRoundId(mode, now);
        const nextId = getRoundId(mode, now + 60000);

        let current = generateRoundResult(currentId);
        let next = generateRoundResult(nextId);

        const config = predictionConfigs[mode];

        if (config) {
          if (config.currentRoundId === currentId)
            current = config.currentResult;

          if (config.nextRoundId === nextId)
            next = config.nextResult;
        }

        return {
          mode,
          current: { id: currentId, ...current },
          next: { id: nextId, ...next }
        };
      });

      setPredictions(updated);
    }, 1000);

    return () => clearInterval(interval);
  }, [predictionConfigs]);

  // ===============================
  // 🔥 FIRESTORE LIVE SYNC
  // ===============================
  useEffect(() => {

    const unsubUsers = onSnapshot(collection(db, "users"), snap => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubDeposits = onSnapshot(
      query(collection(db, "deposits"), orderBy("createdAt", "desc")),
      snap => {
        setDeposits(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    );const unsubWithdrawals = onSnapshot(
      query(collection(db, "withdrawals"), orderBy("createdAt", "desc")),
      snap => {
        setWithdrawals(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    );

    return () => {
      unsubUsers();
      unsubDeposits();
      unsubWithdrawals();
    };

  }, []);

  // ===============================
  // 💰 APPROVE DEPOSIT
  // ===============================
  const approveDeposit = async (req) => {
    try {
      const userRef = doc(db, "users", req.userId);

      await updateDoc(userRef, {
        balance: increment(req.amount)
      });

      await updateDoc(doc(db, "deposits", req.id), {
        status: "completed"
      });

      toast.success("Deposit approved");
    } catch {
      toast.error("Error approving deposit");
    }
  };

  // ===============================
  // 💸 APPROVE WITHDRAWAL
  // ===============================
  const approveWithdrawal = async (req) => {
    try {
      await updateDoc(doc(db, "withdrawals", req.id), {
        status: "completed"
      });

      toast.success("Withdrawal approved");
    } catch {
      toast.error("Error");
    }
  };

  // ===============================
  // 🚫 ADMIN CHECK
  // ===============================
  if (!user || user.role !== "admin") {
    return (
      <div className="h-screen flex items-center justify-center">
        <p>No Access</p>
      </div>
    );
  }

  // ===============================
  // 🎨 UI
  // ===============================
  return (
    <div className="min-h-screen bg-slate-100">

      {/* HEADER */}
      <div className="bg-black text-white p-4 flex justify-between">
        <div className="flex gap-3 items-center">
          <Button onClick={() => onNavigate("home")}>
            <ChevronLeft />
          </Button>
          <h1>Admin Panel</h1>
        </div>

        <Button onClick={() => window.location.reload()}>
          <RefreshCw />
        </Button>
      </div>

      {/* TABS */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex gap-4 p-2">

          <TabsTrigger value="users">
            <Users size={16} /> Users
          </TabsTrigger>

          <TabsTrigger value="finance">
            <Wallet size={16} /> Finance
          </TabsTrigger>

          <TabsTrigger value="prediction">
            <TrendingUp size={16} /> Prediction
          </TabsTrigger>

          <TabsTrigger value="settings">
            <Settings size={16} /> Settings
          </TabsTrigger>

        </TabsList>

        {/* USERS */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Users ({users.length})</CardTitle>
            </CardHeader>

            <CardContent>
              {users.map(u => (
                <div key={u.id} className="flex justify-between p-2 border-b">
                  <span>{u.name}</span>
                  <span>₹{u.balance}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* FINANCE */}
        <TabsContent value="finance">
          <Card>
            <CardHeader>
              <CardTitle>Deposits</CardTitle>
            </CardHeader>

            <CardContent>
              {deposits.map(d => (
                <div key={d.id} className="flex justify-between">
                  <span>{d.amount}</span>
                  <Button onClick={() => approveDeposit(d)}>
                    Approve
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PREDICTION */}
        <TabsContent value="prediction">
          <Card>
            <CardHeader>
              <CardTitle>Live Prediction</CardTitle>
            </CardHeader><CardContent>
              {predictions.map(p => (
                <div key={p.mode} className="p-2 border-b">
                  <p>{p.mode}</p>
                  <p>Current: {p.current.number}</p>
                  <p>Next: {p.next.number}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
