import React, { useState } from "react";
import { NFTStorage } from "nft.storage";

// The API key is loaded from the .env.local file (NEXT_PUBLIC_NFT_STORAGE_KEY)
// NOTE: Make sure your .env.local file is correctly set up!
const API_KEY = process.env.NEXT_PUBLIC_NFT_STORAGE_KEY || "";

// Define the component's props: it takes a function to handle the returned CID
export default function UploadToIPFS({ onCid }: { onCid: (cid: string) => void }) {
  // Use 'any' for file type since the native File object can sometimes cause TS conflicts
  const [file, setFile] = useState<any | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const handleFile = (ev: React.ChangeEvent<HTMLInputElement>) => {
    // Check if files exist before trying to access the first one
    if (ev.target.files && ev.target.files.length > 0) {
      setFile(ev.target.files[0]);
      setMessage(`File selected: ${ev.target.files[0].name}`);
    } else {
      setFile(null);
      setMessage("No file selected.");
    }
  };

  const upload = async () => {
    if (!file) {
      setMessage("Please select a file first.");
      return;
    }
    if (!API_KEY || API_KEY.length < 5) {
      setMessage("Error: NEXT_PUBLIC_NFT_STORAGE_KEY is not correctly set in .env.local.");
      return;
    }

    setMessage("Uploading file to IPFS...");
    setUploading(true);

    try {
      // Create a Blob from the selected file data
      const fileBlob = new Blob([file], { type: file.type });

      // 1. Initialize NFT.Storage client with your API key
      const client = new NFTStorage({ token: API_KEY });

      // 2. Upload the file (blob)
      const cid = await client.storeBlob(fileBlob);

      // 3. Update state with the result
      setUploading(false);
      setMessage(`Upload successful! CID: ${cid.toString()}`);

      // 4. Pass the CID back to the parent component
      onCid(cid.toString());
    } catch (e) {
      console.error("IPFS Upload Error:", e);
      setMessage("Upload failed. Check console or verify your NFT_STORAGE_KEY.");
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col space-y-3 p-4 border rounded-lg bg-base-100">
      <h3 className="text-lg font-semibold">File Upload (IPFS)</h3>

      {/* File Input */}
      <input type="file" onChange={handleFile} className="file-input file-input-bordered w-full" disabled={uploading} />

      {/* Upload Button */}
      <button
        onClick={upload}
        disabled={uploading || !file}
        // Use a standard Tailwind class for the button styling
        className={`btn btn-primary ${uploading ? "bg-gray-500" : "bg-blue-500"} text-white p-2 rounded-md`}
      >
        {uploading ? "Uploading..." : "Upload to IPFS"}
      </button>

      {/* Status Message */}
      {message && <p className="text-sm">{message}</p>}

      <p className="text-xs text-warning">Remember to encrypt sensitive data before uploading for real-world use!</p>
    </div>
  );
}
