"use client";

import React, { useState } from "react";
import UploadToIPFS from "../../components/UploadToIPFS";
import { Address } from "../../components/scaffold-eth/Address/Address";
import { useScaffoldReadContract, useScaffoldWriteContract } from "../../hooks/scaffold-eth";
import { isAddress, keccak256, toUtf8Bytes } from "ethers";
import { NextPage } from "next";
import { useAccount } from "wagmi";

const DoctorPage: NextPage = () => {
  const { address: currentAddress } = useAccount();
  const [tokenId, setTokenId] = useState("");
  const [cid, setCid] = useState("");
  const [note, setNote] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  // Check if the current user has the DOCTOR_ROLE
  const { data: isDoctorRole, isLoading: isRoleLoading } = useScaffoldReadContract({
    contractName: "HealthRecordNFT",
    functionName: "hasRole",
    args: [keccak256(toUtf8Bytes("DOCTOR_ROLE")), currentAddress],
  });

  // Scaffold write contract hook
  const { writeContractAsync: addRecordWrite, isMining } = useScaffoldWriteContract({
    contractName: "HealthRecordNFT",
  });

  const handleAddRecord = async () => {
    if (!tokenId || !cid) {
      setStatusMessage("Error: Token ID and IPFS CID are required.");
      return;
    }

    if (!isAddress(currentAddress || "")) {
      setStatusMessage("Error: Please connect a valid wallet.");
      return;
    }

    try {
      setStatusMessage(`Submitting transaction for Token #${tokenId}...`);
      await addRecordWrite(
        {
          functionName: "addRecord",
          args: [BigInt(tokenId), cid, note],
        },
        {
          onBlockConfirmation: () => {
            setStatusMessage(`Record successfully added to Token #${tokenId}.`);
            setTokenId("");
            setCid("");
            setNote("");
          },
        },
      );
    } catch (e: any) {
      console.error("Add Record Error:", e);
      setStatusMessage("Transaction failed. Check console or verify your access/role.");
    }
  };

  if (isRoleLoading) {
    return (
      <div className="container mx-auto mt-10 p-4 text-center">
        <p className="text-lg">Checking your permissions...</p>
      </div>
    );
  }

  if (!isDoctorRole) {
    return (
      <div className="container mx-auto mt-10 p-4 text-center">
        <h1 className="text-3xl font-bold text-error">Access Denied 🚫</h1>
        <p className="text-lg mt-4">
          You must be assigned the <strong>DOCTOR_ROLE</strong> by the Administrator to use this dashboard.
        </p>
        <p className="mt-2">
          Your Address: <Address address={currentAddress} />
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto mt-10 p-4">
      <h1 className="text-3xl font-bold mb-6">Doctor Dashboard 🧑‍⚕</h1>
      <p className="mb-4">
        Status: <span className="text-success">Authorized Doctor</span>
      </p>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Upload Section */}
        <div className="lg:w-1/3">
          <UploadToIPFS onCid={setCid} />
        </div>

        {/* Add Record Form */}
        <div className="lg:w-2/3 p-6 border rounded-lg shadow-lg bg-base-200">
          <h2 className="text-2xl font-semibold mb-4">2. Submit Medical Record</h2>

          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text font-medium">Patient Record Token ID</span>
            </label>
            <input
              type="number"
              placeholder="e.g., 1, 2, 3"
              className="input input-bordered w-full"
              value={tokenId}
              onChange={e => setTokenId(e.target.value)}
            />
          </div>

          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text font-medium">IPFS CID (Content ID)</span>
            </label>
            <input
              type="text"
              placeholder="e.g., bafybeih..."
              className="input input-bordered w-full font-mono text-sm"
              value={cid}
              readOnly
            />
            {cid && <p className="text-sm mt-1 text-success">CID obtained from IPFS upload (left).</p>}
          </div>

          <div className="form-control mb-6">
            <label className="label">
              <span className="label-text font-medium">Note (e.g., Lab Result, Diagnosis)</span>
            </label>
            <textarea
              placeholder="Patient stable. Prescription filled."
              className="textarea textarea-bordered h-24 w-full"
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>

          <button
            className="btn btn-primary btn-lg w-full"
            onClick={handleAddRecord}
            disabled={!tokenId || !cid || isMining}
          >
            {isMining ? "Submitting..." : "Submit Record to Blockchain"}
          </button>

          {statusMessage && <p className="mt-4 text-sm font-medium">{statusMessage}</p>}
        </div>
      </div>
    </div>
  );
};

export default DoctorPage;
