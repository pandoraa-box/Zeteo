import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
    try {
        console.log("Starting deployment to Stellar Testnet...\n");

        // Build the Soroban contract
        console.log("Building Soroban contract...");
        execSync('cargo build --target wasm32v1-none --release', {
            cwd: path.join(__dirname, 'contracts'),
            stdio: 'inherit'
        });
        console.log("Contract built successfully\n");

        // Deploy using stellar CLI
        console.log("Deploying contract...");
        const wasmPath = path.join(__dirname, 'contracts/target/wasm32v1-none/release/zeteo_subscription.wasm');

        if (!fs.existsSync(wasmPath)) {
            throw new Error(`WASM file not found at ${wasmPath}`);
        }

        // Use stellar CLI to deploy
        // Note: This requires stellar CLI to be installed and configured
        const deployOutput = execSync(
            `stellar contract deploy --wasm ${wasmPath} --source-account deployer --network testnet`,
            { encoding: 'utf-8' }
        );

        // Extract contract address from output
        const contractMatch = deployOutput.match(/Contract Address:\s+(\S+)/);
        if (!contractMatch) {
            throw new Error('Could not extract contract address from deployment output');
        }

        const contractAddress = contractMatch[1];
        console.log(`Contract deployed successfully!`);
        console.log(`Contract Address: ${contractAddress}\n`);

        // Update .env.local
        const envPath = path.join(__dirname, ".env.local");
        if (fs.existsSync(envPath)) {
            let envContent = fs.readFileSync(envPath, "utf8");

            envContent = envContent.replace(
                /NEXT_PUBLIC_CONTRACT_ADDRESS=.*/,
                `NEXT_PUBLIC_CONTRACT_ADDRESS=${contractAddress}`
            );

            fs.writeFileSync(envPath, envContent);
            console.log("Updated .env.local with contract address");
        }

        console.log("\nDeployment complete!");
        console.log(`\nContract Address: ${contractAddress}`);
        console.log(`\nView on Stellar Explorer: https://testnet.stellarexpert.io/contract/${contractAddress}`);

    } catch (error) {
        console.error("Deployment failed:", error);
        process.exit(1);
    }
}

main();
