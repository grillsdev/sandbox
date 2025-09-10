import { Sandbox } from '@e2b/code-interpreter'
import express from "express";

const router = express.Router();

router.post<{ e2bSandboxAPI: string, e2bSandboxId: string }>("/create", async (req, res) => {
    const { sandboxAPI, msgId, code } = <{ sandboxAPI: string, msgId: string, code: string }>req.body;
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
        const sandbox = await Sandbox.create("hnh6yl8ejhv6y03c5vml", {
            apiKey: sandboxAPI,
            timeoutMs: 1500000,
            metadata: {
                sandboxId: `grills:${msgId}`,
                msgId
            }
        })
        await sandbox.files.write("/home/user/pages/generated-components.tsx", code)
        console.warn("Starting development server...")
        sandbox.commands.run("npm run dev", {
            cwd: "/home/user",
            background: true
        })
        await new Promise(resolve => setTimeout(resolve, 3000))

        const previewUrl = `https://${sandbox.getHost(3000)}`
        res.json({
            e2bSandboxAPI: sandboxAPI,
            e2bSandboxId: `grills:${msgId}`,
            previewUrl,
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.warn(errorMessage)
        res.status(500).json({ error: "Failed to create sandbox", details: errorMessage });
    }
});


export default router;
