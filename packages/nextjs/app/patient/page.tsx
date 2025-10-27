"use client";

// Required for React hooks and Wagmi/Scaffold-ETH hooks
import React, { useEffect, useState } from "react";
import { Address } from "../../components/scaffold-eth/Address/Address";
import { useScaffoldReadContract, useScaffoldWriteContract } from "../../hooks/scaffold-eth";
import { isAddress } from "viem";
import { useAccount } from "wagmi";
import { INDEFINITE_ACCESS } from "~~/constants";

// --- START: CUSTOM HOOK TO FIND ALL TOKENS OWNED BY USER ---

const MAX_TOKEN_ID_CHECK = 50;

const useOwnedTokenIds = () => {
  const { address: currentAddress } = useAccount();
  const [ownedTokens, setOwnedTokens] = useState<number[]>([]);

  const { data: nextTokenIdBigInt } = useScaffoldReadContract({
    contractName: "HealthRecordNFT",
    functionName: "_tokenIds",
  });
  const maxTokenId = Number(nextTokenIdBigInt || 0);

  const [tokenIdToCheck, setTokenIdToCheck] = useState<number>(1);
  const { refetch: refetchOwnerOf } = useScaffoldReadContract({
    contractName: "HealthRecordNFT",
    functionName: "ownerOf",
    args: [BigInt(tokenIdToCheck)],
    query: {
      enabled: tokenIdToCheck > 0 && tokenIdToCheck <= maxTokenId,
    },
  });

  useEffect(() => {
    if (!currentAddress || maxTokenId === 0) return;

    const tokens: number[] = [];
    let currentId = 1;
    const limit = Math.min(maxTokenId, MAX_TOKEN_ID_CHECK);

    const checkNextToken = async () => {
      if (currentId > limit) {
        setOwnedTokens(tokens);
        return;
      }

      setTokenIdToCheck(currentId);
      const { data: owner } = await refetchOwnerOf();

      if (owner && owner.toLowerCase() === currentAddress.toLowerCase()) {
        tokens.push(currentId);
      }

      currentId++;
      setTimeout(checkNextToken, 10);
    };

    checkNextToken();
  }, [currentAddress, maxTokenId, refetchOwnerOf]);

  return ownedTokens;
};

// --- END: CUSTOM HOOK ---

const PatientPage = () => {
  const { address: currentAddress } = useAccount();
  const myTokens = useOwnedTokenIds();

  const [selectedTokenId, setSelectedTokenId] = useState<number | null>(null);
  const [viewerAddress, setViewerAddress] = useState("");

  const { data: recordHistory, refetch: refetchHistory } = useScaffoldReadContract({
    contractName: "HealthRecordNFT",
    functionName: "viewRecordHistory",
    args: selectedTokenId ? [BigInt(selectedTokenId)] : undefined,
    query: {
      enabled: selectedTokenId !== null,
    },
  });

  const { writeContractAsync: grantAccessWrite } = useScaffoldWriteContract({
    contractName: "HealthRecordNFT",
  });

  const { writeContractAsync: revokeAccessWrite } = useScaffoldWriteContract({
    contractName: "HealthRecordNFT",
  });

  const handleGrantAccess = async () => {
    if (!selectedTokenId || !isAddress(viewerAddress)) {
      alert("Invalid viewer address or no token selected.");
      return;
    }

    try {
      await grantAccessWrite({
        functionName: "grantAccess",
        args: [BigInt(selectedTokenId), viewerAddress as `0x${string}`, BigInt(INDEFINITE_ACCESS)],
      });
      alert(`Access granted to ${viewerAddress} for token ${selectedTokenId}`);
      refetchHistory();
    } catch (err) {
      console.error("Grant access failed:", err);
      alert("Transaction failed. Check console for details.");
    }
  };

  const handleRevokeAccess = async () => {
    if (!selectedTokenId || !isAddress(viewerAddress)) {
      alert("Invalid viewer address or no token selected.");
      return;
    }

    try {
      await revokeAccessWrite({
        functionName: "revokeAccess",
        args: [BigInt(selectedTokenId), viewerAddress as `0x${string}`],
      });
      alert(`Access revoked for ${viewerAddress} on token ${selectedTokenId}`);
      refetchHistory();
    } catch (err) {
      console.error("Revoke access failed:", err);
      alert("Transaction failed. Check console for details.");
    }
  };

  return (
    <div className="container mx-auto mt-10 p-4">
      <h1 className="text-3xl font-bold mb-6">Patient Dashboard 🩺</h1>
      <p className="mb-4">
        Your Address: <Address address={currentAddress} />
      </p>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-3">Your Health Record Tokens</h2>
        {myTokens.length === 0 ? (
          <p className="text-warning">Searching for records... or no records found. Check console for errors.</p>
        ) : (
          <p className="text-info">{myTokens.length} record(s) found. Select one to manage access.</p>
        )}
        <ul className="list-disc pl-5">
          {myTokens.map(t => (
            <li key={t} className="mb-2">
              Token ID: <strong>{t}</strong> -{" "}
              <button
                className={`ml-3 btn btn-xs ${selectedTokenId === t ? "btn-success" : "btn-info"}`}
                onClick={() => setSelectedTokenId(t)}
              >
                {selectedTokenId === t ? "Selected" : "Select & View History"}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {selectedTokenId && (
        <div className="border p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold mb-4">Manage Token #{selectedTokenId}</h2>

          <div className="mb-6 p-4 border rounded-md bg-base-200">
            <h3 className="text-xl font-medium mb-3">Consent Management (Grant/Revoke)</h3>
            <input
              type="text"
              placeholder="Viewer Address (Doctor/Hospital/Insurer)"
              className="input input-bordered w-full max-w-md mb-3"
              value={viewerAddress}
              onChange={e => setViewerAddress(e.target.value)}
            />
            <div className="flex space-x-4">
              <button className="btn btn-success" onClick={handleGrantAccess}>
                Grant Indefinite Access
              </button>
              <button className="btn btn-warning" onClick={handleRevokeAccess}>
                Revoke Access
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-medium mb-3">Record History</h3>
            <button className="btn btn-xs btn-outline mb-2" onClick={() => refetchHistory()}>
              Refresh History
            </button>
            {(recordHistory as any[])?.length > 0 ? (
              (recordHistory as any[]).map((r, i) => (
                <div key={i} className="border-b p-3 bg-white rounded-md mb-2">
                  <p>
                    <strong>Entry #{i + 1}:</strong>
                  </p>
                  <p>
                    CID: <span className="font-mono text-sm break-all">{r.cid}</span>
                  </p>
                  <p>
                    Added By: <Address address={r.addedBy} />
                  </p>
                  <p>Date: {new Date(Number(r.timestamp) * 1000).toLocaleString()}</p>
                  <p>Note: {r.note}</p>
                  <a
                    href={`https://ipfs.io/ipfs/${r.cid}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    View File (Off-Chain Link)
                  </a>
                </div>
              ))
            ) : (
              <p>No history entries found for this token.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientPage;
