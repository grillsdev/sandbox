/* eslint-disable node/no-process-env */
import { Sandbox } from '@e2b/code-interpreter'
import dotenv from 'dotenv';
import express from "express";

dotenv.config();


const router = express.Router();

router.post("/create", async (req, res) => {
    const { sandboxAPI, msgId, code, css } = <{ sandboxAPI: string, msgId: string, code: string, css:string }>req.body;
    if (!sandboxAPI || !msgId) {
        throw new Error("Missing required parameters: sandboxAPI and msgId");
    }
    try {
        //if sandbox with same msgId is already present just return the preview
        const sandboxes = await Sandbox.list({
            apiKey: sandboxAPI,
            query: {
                metadata: {
                    sandboxId: `grills:${msgId}`,
                    msgId
                },
            },
        })
        const sandboxList = await sandboxes.nextItems()
        if (sandboxList.length > 0) {
            const newSandbox = sandboxList[0]
            res.json({
                e2bSandboxAPI: sandboxAPI,
                e2bSandboxId: `grills:${msgId}`,
                previewUrl:`https://3000-${newSandbox.sandboxId}.e2b.app`,
            });
            return;
        }

        // const sandbox = sandboxList[0]
        // template created for this repo (https://github.com/grillsdev/open-template)
        const sandbox = await Sandbox.create(process.env.SANDBOX_ID!, {
            apiKey: sandboxAPI,
            timeoutMs: 1500000,
            metadata: {
                sandboxId: `grills:${msgId}`,
                msgId
            }
        })
        await sandbox.files.write("/home/user/pages/generated-components.tsx", code)
        await sandbox.files.write("/home/user/styles/globals.css", css)
        console.warn("Starting development server...")
        sandbox.commands.run("npm run dev", {
            cwd: "/home/user",
            background: true
        })

        const previewUrl = `https://${sandbox.getHost(3000)}`
        res.json({
            e2bSandboxAPI: sandboxAPI,
            e2bSandboxId: `grills:${msgId}`,
            previewUrl,
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        res.status(400).json({ error: "Failed to create sandbox", message: errorMessage });
    }
});


export default router;
