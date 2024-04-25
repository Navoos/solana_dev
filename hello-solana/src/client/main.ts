import {
	Keypair,
	Connection,
	PublicKey,
	LAMPORTS_PER_SOL,
	TransactionInstruction,
	Transaction,
	sendAndConfirmTransaction,
} from "@solana/web3.js";

import fs from "mz/fs";
import path from "path";

const PROGRAM_KEYPAIR_PATH = path.join(
	path.resolve(__dirname, '../../dist/program'),
	'program-keypair.json',
);

const RPC_API = "http://127.0.0.1:8899";

async function main() : Promise<void> {
	console.log("Launching client ...");

	/*
	* establish connection to the cluster
	*/

	let connection = new Connection(RPC_API, "confirmed");

	const secretKeyString = await fs.readFile(PROGRAM_KEYPAIR_PATH, {encoding: 'utf8'});
	const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
	const programKeypair = Keypair.fromSecretKey(secretKey);
	let programId: PublicKey = programKeypair.publicKey;
	
	/*
	 * generate account to transact with our on-chain code
	 */
	
	const clientKeypair = Keypair.generate();
	const airDropReq = await connection.requestAirdrop(
		clientKeypair.publicKey,
		5 * LAMPORTS_PER_SOL,
	);
	
	/*
	 * confirm the airdrop request
	 */

	const latestBlockHash = await connection.getLatestBlockhash();
	await connection.confirmTransaction({
		blockhash: latestBlockHash.blockhash,
		lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
		signature: airDropReq

	});
	
 	console.log("... Pinging program: ", programId.toBase58());
	const instruction = new TransactionInstruction({
		keys: [{pubkey: clientKeypair.publicKey, isSigner: false, isWritable: true}],
		programId,
		data: Buffer.alloc(0),
	});
	
	await sendAndConfirmTransaction(
		connection,
		new Transaction().add(instruction),
		[clientKeypair],
	);
}

try {
	main();
} catch (err) {
	console.log(err);
	process.exit(-1);
}
