"use client";

import { useState, useEffect, useCallback } from "react";
import {
  GOVERNANCE_TOKEN_ADDRESS,
  DAO_ADDRESS,
  tokenMint,
  tokenTransfer,
  tokenBalance,
  tokenTotalSupply,
  daoCreateProposal,
  daoVote,
  daoExecute,
  daoGetProposal,
  daoGetProposalCount,
  daoHasVoted,
  daoGetActiveProposals,
  daoGetAllProposals,
} from "@/hooks/contract";
import { AnimatedCard } from "@/components/ui/animated-card";
import { Spotlight } from "@/components/ui/spotlight";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ── Icons ────────────────────────────────────────────────────

function SpinnerIcon() {
  return (
    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function TokenIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v12M6 12h12" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function VoteIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

// ── Styled Input ─────────────────────────────────────────────

function Input({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-2">
      <label className="block text-[11px] font-medium uppercase tracking-wider text-white/30">
        {label}
      </label>
      <div className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-px transition-all focus-within:border-[#7c6cf0]/30">
        <input
          {...props}
          className="w-full rounded-[11px] bg-transparent px-4 py-3 font-mono text-sm text-white/90 placeholder:text-white/15 outline-none"
        />
      </div>
    </div>
  );
}

// ── Proposal Types ───────────────────────────────────────────

interface Proposal {
  id: number;
  title: string;
  description: string;
  execution_data: string;
  creator: string;
  yes_votes: bigint;
  no_votes: bigint;
  voters: string[];
  created_at: bigint;
  deadline: bigint;
  executed: boolean;
}

// ── Token Tab ────────────────────────────────────────────────

function TokenTab({
  walletAddress,
  onConnect,
  isConnecting,
}: {
  walletAddress: string | null;
  onConnect: () => void;
  isConnecting: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [totalSupply, setTotalSupply] = useState<bigint | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);

  const [mintTo, setMintTo] = useState("");
  const [mintAmount, setMintAmount] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const [transferAmount, setTransferAmount] = useState("");

  const truncate = (addr: string) =>
    addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "";

  const refreshStats = useCallback(async () => {
    if (!walletAddress) return;
    setIsRefreshing(true);
    try {
      const bal = await tokenBalance(walletAddress);
      const supply = await tokenTotalSupply();
      setBalance(bal !== null ? BigInt(bal) : BigInt(0));
      setTotalSupply(supply !== null ? BigInt(supply) : BigInt(0));
    } catch {
      // silent
    } finally {
      setIsRefreshing(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  const handleMint = useCallback(async () => {
    if (!walletAddress) return setError("Connect wallet first");
    if (!mintTo.trim()) return setError("Enter recipient address");
    if (!mintAmount || Number(mintAmount) <= 0) return setError("Enter a valid amount");
    setError(null);
    setIsMinting(true);
    setTxStatus("Awaiting signature...");
    try {
      await tokenMint(walletAddress, mintTo.trim(), BigInt(mintAmount));
      setTxStatus("Tokens minted on-chain!");
      setMintTo("");
      setMintAmount("");
      await refreshStats();
      setTimeout(() => setTxStatus(null), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setTxStatus(null);
    } finally {
      setIsMinting(false);
    }
  }, [walletAddress, mintTo, mintAmount, refreshStats]);

  const handleTransfer = useCallback(async () => {
    if (!walletAddress) return setError("Connect wallet first");
    if (!transferTo.trim()) return setError("Enter recipient address");
    if (!transferAmount || Number(transferAmount) <= 0) return setError("Enter a valid amount");
    setError(null);
    setIsTransferring(true);
    setTxStatus("Awaiting signature...");
    try {
      await tokenTransfer(walletAddress, walletAddress, transferTo.trim(), BigInt(transferAmount));
      setTxStatus("Tokens transferred on-chain!");
      setTransferTo("");
      setTransferAmount("");
      await refreshStats();
      setTimeout(() => setTxStatus(null), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setTxStatus(null);
    } finally {
      setIsTransferring(false);
    }
  }, [walletAddress, transferTo, transferAmount, refreshStats]);

  return (
    <div className="space-y-5">
      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
          <p className="text-[10px] uppercase tracking-wider text-white/25 mb-1">Your Balance</p>
          <p className="font-mono text-lg font-bold text-white/80">
            {balance !== null ? Number(balance).toLocaleString() : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
          <p className="text-[10px] uppercase tracking-wider text-white/25 mb-1">Total Supply</p>
          <p className="font-mono text-lg font-bold text-white/80">
            {totalSupply !== null ? Number(totalSupply).toLocaleString() : "—"}
          </p>
        </div>
      </div>

      {/* Mint Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <TokenIcon />
          <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">Mint Tokens</span>
        </div>
        <Input
          label="Recipient Address"
          value={mintTo}
          onChange={(e) => setMintTo(e.target.value)}
          placeholder="G... address"
        />
        <Input
          label="Amount"
          type="number"
          value={mintAmount}
          onChange={(e) => setMintAmount(e.target.value)}
          placeholder="1000"
        />
        {walletAddress ? (
          <ShimmerButton onClick={handleMint} disabled={isMinting} shimmerColor="#34d399" className="w-full">
            {isMinting ? (
              <><SpinnerIcon /> Minting...</>
            ) : (
              <><TokenIcon /> Mint Tokens</>
            )}
          </ShimmerButton>
        ) : (
          <button
            onClick={onConnect}
            disabled={isConnecting}
            className="w-full rounded-xl border border-dashed border-[#34d399]/20 bg-[#34d399]/[0.03] py-3 text-sm text-[#34d399]/60 hover:border-[#34d399]/30 hover:text-[#34d399]/80 transition-all"
          >
            Connect wallet to mint
          </button>
        )}
      </div>

      {/* Transfer Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <SendIcon />
          <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">Transfer Tokens</span>
        </div>
        <Input
          label="Recipient Address"
          value={transferTo}
          onChange={(e) => setTransferTo(e.target.value)}
          placeholder="G... address"
        />
        <Input
          label="Amount"
          type="number"
          value={transferAmount}
          onChange={(e) => setTransferAmount(e.target.value)}
          placeholder="100"
        />
        {walletAddress ? (
          <ShimmerButton onClick={handleTransfer} disabled={isTransferring} shimmerColor="#fbbf24" className="w-full">
            {isTransferring ? (
              <><SpinnerIcon /> Transferring...</>
            ) : (
              <><SendIcon /> Transfer</>
            )}
          </ShimmerButton>
        ) : (
          <button
            onClick={onConnect}
            disabled={isConnecting}
            className="w-full rounded-xl border border-dashed border-[#fbbf24]/20 bg-[#fbbf24]/[0.03] py-3 text-sm text-[#fbbf24]/60 hover:border-[#fbbf24]/30 hover:text-[#fbbf24]/80 transition-all"
          >
            Connect wallet to transfer
          </button>
        )}
      </div>
    </div>
  );
}

// ── DAO Tab ──────────────────────────────────────────────────

function DaoTab({
  walletAddress,
  onConnect,
  isConnecting,
}: {
  walletAddress: string | null;
  onConnect: () => void;
  isConnecting: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"proposals" | "create">("proposals");
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [executionData, setExecutionData] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [votingOn, setVotingOn] = useState<number | null>(null);

  const refreshProposals = useCallback(async () => {
    setIsLoading(true);
    try {
      const count = await daoGetProposalCount();
      const all: Proposal[] = [];
      const total = count !== null ? Number(count) : 0;
      for (let i = 0; i < total; i++) {
        const p = await daoGetProposal(i);
        if (p) {
          all.push({
            id: Number(p.id),
            title: String(p.title),
            description: String(p.description),
            execution_data: String(p.execution_data),
            creator: String(p.creator),
            yes_votes: BigInt(p.yes_votes),
            no_votes: BigInt(p.no_votes),
            voters: p.voters ? (Array.from(p.voters as unknown as string[])) : [],
            created_at: BigInt(p.created_at),
            deadline: BigInt(p.deadline),
            executed: Boolean(p.executed),
          });
        }
      }
      setProposals(all.reverse()); // newest first
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProposals();
  }, [refreshProposals]);

  const handleCreate = useCallback(async () => {
    if (!walletAddress) return setError("Connect wallet first");
    if (!title.trim()) return setError("Enter a title");
    if (!description.trim()) return setError("Enter a description");
    setError(null);
    setIsCreating(true);
    setTxStatus("Awaiting signature...");
    try {
      await daoCreateProposal(
        walletAddress,
        title.trim(),
        description.trim(),
        executionData.trim()
      );
      setTxStatus("Proposal created on-chain!");
      setTitle("");
      setDescription("");
      setExecutionData("");
      setActiveTab("proposals");
      await refreshProposals();
      setTimeout(() => setTxStatus(null), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setTxStatus(null);
    } finally {
      setIsCreating(false);
    }
  }, [walletAddress, title, description, executionData, refreshProposals]);

  const handleVote = useCallback(
    async (proposalId: number, support: boolean) => {
      if (!walletAddress) return setError("Connect wallet first");
      setError(null);
      setVotingOn(proposalId);
      setTxStatus("Awaiting signature...");
      try {
        await daoVote(walletAddress, proposalId, support);
        setTxStatus("Vote cast on-chain!");
        await refreshProposals();
        setTimeout(() => setTxStatus(null), 5000);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Transaction failed");
        setTxStatus(null);
      } finally {
        setVotingOn(null);
      }
    },
    [walletAddress, refreshProposals]
  );

  const handleExecute = useCallback(
    async (proposalId: number) => {
      if (!walletAddress) return setError("Connect wallet first");
      setError(null);
      setVotingOn(proposalId);
      setTxStatus("Awaiting signature...");
      try {
        await daoExecute(walletAddress, proposalId);
        setTxStatus("Proposal executed on-chain!");
        await refreshProposals();
        setTimeout(() => setTxStatus(null), 5000);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Transaction failed");
        setTxStatus(null);
      } finally {
        setVotingOn(null);
      }
    },
    [walletAddress, refreshProposals]
  );

  const now = Math.floor(Date.now() / 1000);

  const getProposalStatus = (p: Proposal) => {
    if (p.executed) return { label: "Executed", color: "text-[#34d399]", dot: "bg-[#34d399]", bg: "bg-[#34d399]/10", border: "border-[#34d399]/20", variant: "success" as const };
    if (now > Number(p.deadline)) return { label: "Closed", color: "text-[#f87171]", dot: "bg-[#f87171]", bg: "bg-[#f87171]/10", border: "border-[#f87171]/20", variant: "warning" as const };
    return { label: "Active", color: "text-[#7c6cf0]", dot: "bg-[#7c6cf0]", bg: "bg-[#7c6cf0]/10", border: "border-[#7c6cf0]/20", variant: "info" as const };
  };

  return (
    <div className="space-y-5">
      {/* Sub-tabs */}
      <div className="flex border-b border-white/[0.06]">
        {[
          { key: "proposals" as const, label: "Proposals", icon: <VoteIcon /> },
          { key: "create" as const, label: "Create", icon: <PlusIcon /> },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => { setActiveTab(t.key); setError(null); }}
            className={cn(
              "relative flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all",
              activeTab === t.key ? "text-white/90" : "text-white/35 hover:text-white/55"
            )}
          >
            <span style={{ color: activeTab === t.key ? (t.key === "proposals" ? "#7c6cf0" : "#34d399") : undefined }}>
              {t.icon}
            </span>
            {t.label}
            {activeTab === t.key && (
              <span className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-gradient-to-r from-[#7c6cf0] to-[#4fc3f7]" />
            )}
          </button>
        ))}
      </div>

      {/* Proposals List */}
      {activeTab === "proposals" && (
        <div className="space-y-4">
          <button
            onClick={refreshProposals}
            disabled={isLoading}
            className="text-xs text-white/25 hover:text-white/40 transition-all flex items-center gap-1"
          >
            <span className={cn(isLoading && "animate-spin")}><ClockIcon /></span>
            {isLoading ? "Loading..." : `${proposals.length} proposal${proposals.length !== 1 ? "s" : ""}`}
          </button>

          {proposals.length === 0 && !isLoading && (
            <div className="rounded-xl border border-dashed border-white/[0.06] bg-white/[0.02] px-6 py-8 text-center">
              <VoteIcon />
              <p className="text-sm text-white/30 mt-2">No proposals yet. Be the first to create one!</p>
            </div>
          )}

          {proposals.map((p) => {
            const status = getProposalStatus(p);
            const totalVotes = Number(p.yes_votes) + Number(p.no_votes);
            const yesPct = totalVotes > 0 ? Math.round((Number(p.yes_votes) / totalVotes) * 100) : 0;
            const canExecute = !p.executed && now > Number(p.deadline) && Number(p.yes_votes) > Number(p.no_votes);

            return (
              <div key={p.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden animate-fade-in-up">
                <div className="px-4 py-3 flex items-center justify-between border-b border-white/[0.04]">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-xs text-white/25 shrink-0">#{p.id}</span>
                    <span className="text-sm font-medium text-white/80 truncate">{p.title}</span>
                  </div>
                  <Badge variant={status.variant}>
                    <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />
                    {status.label}
                  </Badge>
                </div>
                <div className="p-4 space-y-3">
                  <p className="text-xs text-white/40 leading-relaxed">{p.description}</p>

                  {/* Vote Bar */}
                  {totalVotes > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-white/25 font-mono">
                        <span className="text-[#34d399]">{yesPct}% Yes</span>
                        <span className="text-[#f87171]">{100 - yesPct}% No</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#34d399] to-[#7c6cf0] transition-all"
                          style={{ width: `${yesPct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-white/25 font-mono">
                        <span>{String(p.yes_votes)} yes</span>
                        <span>{String(p.no_votes)} no</span>
                      </div>
                    </div>
                  )}

                  {/* Deadline */}
                  <div className="flex items-center gap-1.5 text-[10px] text-white/25">
                    <ClockIcon />
                    <span>
                      {now > Number(p.deadline)
                        ? "Voting ended"
                        : `${Math.ceil((Number(p.deadline) - now) / 3600)}h remaining`}
                    </span>
                    <span className="mx-1">&middot;</span>
                    <UsersIcon />
                    <span>{p.voters.length} votes</span>
                  </div>

                  {/* Actions */}
                  {!p.executed && now <= Number(p.deadline) && walletAddress && (
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => handleVote(p.id, true)}
                        disabled={votingOn !== null}
                        className="flex-1 rounded-lg border border-[#34d399]/20 bg-[#34d399]/[0.05] px-3 py-2 text-xs font-medium text-[#34d399] hover:border-[#34d399]/40 transition-all active:scale-95 disabled:opacity-50"
                      >
                        Vote Yes
                      </button>
                      <button
                        onClick={() => handleVote(p.id, false)}
                        disabled={votingOn !== null}
                        className="flex-1 rounded-lg border border-[#f87171]/20 bg-[#f87171]/[0.05] px-3 py-2 text-xs font-medium text-[#f87171] hover:border-[#f87171]/40 transition-all active:scale-95 disabled:opacity-50"
                      >
                        Vote No
                      </button>
                    </div>
                  )}

                  {canExecute && (
                    <button
                      onClick={() => handleExecute(p.id)}
                      disabled={votingOn !== null}
                      className="w-full rounded-lg border border-[#fbbf24]/20 bg-[#fbbf24]/[0.05] px-3 py-2 text-xs font-medium text-[#fbbf24] hover:border-[#fbbf24]/40 transition-all active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <PlayIcon />
                      Execute Proposal
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Proposal */}
      {activeTab === "create" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-dashed border-[#7c6cf0]/20 bg-[#7c6cf0]/[0.02] px-4 py-3 text-xs text-[#7c6cf0]/50">
            Anyone can create a proposal. Voting lasts 24 hours. Proposals with more Yes votes than No votes pass.
          </div>
          <Input
            label="Proposal Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Allocate dev fund"
          />
          <div className="space-y-2">
            <label className="block text-[11px] font-medium uppercase tracking-wider text-white/30">
              Description
            </label>
            <div className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-px">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this proposal does..."
                rows={3}
                className="w-full rounded-[11px] bg-transparent px-4 py-3 font-mono text-sm text-white/90 placeholder:text-white/15 outline-none resize-none"
              />
            </div>
          </div>
          <Input
            label="Execution Data (optional)"
            value={executionData}
            onChange={(e) => setExecutionData(e.target.value)}
            placeholder="e.g. transfer 1000 to G..."
          />
          {walletAddress ? (
            <ShimmerButton onClick={handleCreate} disabled={isCreating} shimmerColor="#7c6cf0" className="w-full">
              {isCreating ? <><SpinnerIcon /> Creating...</> : <><PlusIcon /> Create Proposal</>}
            </ShimmerButton>
          ) : (
            <button
              onClick={onConnect}
              disabled={isConnecting}
              className="w-full rounded-xl border border-dashed border-[#7c6cf0]/20 bg-[#7c6cf0]/[0.03] py-3 text-sm text-[#7c6cf0]/60 hover:border-[#7c6cf0]/30 hover:text-[#7c6cf0]/80 transition-all"
            >
              Connect wallet to create
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Governance Component ────────────────────────────────

type Tab = "token" | "dao";

interface GovernanceUIProps {
  walletAddress: string | null;
  onConnect: () => void;
  isConnecting: boolean;
}

export default function GovernanceUI({
  walletAddress,
  onConnect,
  isConnecting,
}: GovernanceUIProps) {
  const [activeTab, setActiveTab] = useState<Tab>("token");
  const [error, setError] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<string | null>(null);

  const truncate = (addr: string) =>
    addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "";

  const tabs: { key: Tab; label: string; icon: React.ReactNode; color: string }[] = [
    { key: "token", label: "Token", icon: <TokenIcon />, color: "#7c6cf0" },
    { key: "dao", label: "DAO", icon: <VoteIcon />, color: "#4fc3f7" },
  ];

  return (
    <div className="w-full max-w-2xl animate-fade-in-up-delayed">
      {/* Toasts */}
      {error && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-[#f87171]/15 bg-[#f87171]/[0.05] px-4 py-3 backdrop-blur-sm animate-slide-down">
          <span className="mt-0.5 text-[#f87171]"><AlertIcon /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[#f87171]/90">Error</p>
            <p className="text-xs text-[#f87171]/50 mt-0.5 break-all">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="shrink-0 text-[#f87171]/30 hover:text-[#f87171]/70 text-lg leading-none">&times;</button>
        </div>
      )}

      {txStatus && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-[#34d399]/15 bg-[#34d399]/[0.05] px-4 py-3 backdrop-blur-sm animate-slide-down">
          <span className="text-[#34d399]">
            {txStatus.includes("on-chain") ? <CheckIcon /> : <SpinnerIcon />}
          </span>
          <span className="text-sm text-[#34d399]/90">{txStatus}</span>
        </div>
      )}

      {/* Main Card */}
      <Spotlight className="rounded-2xl">
        <AnimatedCard className="p-0" containerClassName="rounded-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#7c6cf0]/20 to-[#4fc3f7]/20 border border-white/[0.06]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#7c6cf0]">
                  <path d="M3 3h7v7H3z" />
                  <path d="M14 3h7v7h-7z" />
                  <path d="M14 17h7v4h-7z" />
                  <path d="M3 14h7v7H3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white/90">Governance Platform</h3>
                <div className="flex gap-3 mt-0.5">
                  <p className="text-[10px] text-white/25 font-mono">
                    Token: {truncate(GOVERNANCE_TOKEN_ADDRESS)}
                  </p>
                  <p className="text-[10px] text-white/25 font-mono">
                    DAO: {truncate(DAO_ADDRESS)}
                  </p>
                </div>
              </div>
            </div>
            <Badge variant="info" className="text-[10px]">Permissionless</Badge>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/[0.06] px-2">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => { setActiveTab(t.key); setError(null); setTxStatus(null); }}
                className={cn(
                  "relative flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-all",
                  activeTab === t.key ? "text-white/90" : "text-white/35 hover:text-white/55"
                )}
              >
                <span style={{ color: activeTab === t.key ? t.color : undefined }}>{t.icon}</span>
                {t.label}
                {activeTab === t.key && (
                  <span
                    className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full"
                    style={{ background: `linear-gradient(to right, ${t.color}, ${t.color}66)` }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === "token" && (
              <TokenTab
                walletAddress={walletAddress}
                onConnect={onConnect}
                isConnecting={isConnecting}
              />
            )}
            {activeTab === "dao" && (
              <DaoTab
                walletAddress={walletAddress}
                onConnect={onConnect}
                isConnecting={isConnecting}
              />
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-white/[0.04] px-6 py-3 flex items-center justify-between">
            <p className="text-[10px] text-white/15">Fully Permissionless &middot; Soroban</p>
            <div className="flex items-center gap-2">
              {["Mint", "Transfer", "Propose", "Vote"].map((s, i) => (
                <span key={s} className="flex items-center gap-1.5">
                  <span className="font-mono text-[9px] text-white/15">{s}</span>
                  {i < 3 && <span className="text-white/10 text-[8px]">&rarr;</span>}
                </span>
              ))}
            </div>
          </div>
        </AnimatedCard>
      </Spotlight>
    </div>
  );
}
