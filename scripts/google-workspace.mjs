// Run Google's official Workspace MCP release on macOS or Linux.
// The first launch downloads a platform-specific bundle; subsequent launches
// use the installed copy. OAuth is handled by the official server.
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const version = "v0.0.8";
// SHA-256 digests published with the official GitHub release assets.
const digests = {
  darwin: "ca53101fd8b355d7710ffc28d55b4f558df621861ff8cdb9e5e426987f290e80",
  linux: "58e440542330f7f32906b0e1ec5171778b1d82c5343e690c611b76b940460cb7",
};

try {
  if (Number(process.versions.node.split(".")[0]) < 20) {
    throw new Error("Google Workspace MCP requires Node.js 20 or newer.");
  }
  const digest = digests[process.platform];
  if (!digest) {
    throw new Error(`Unsupported platform: ${process.platform}`);
  }

  const root = join(
    homedir(),
    ".local/share/opencode/google-workspace-official",
    version,
  );
  const installation = join(root, `${process.platform}-${process.arch}`);
  const entry = join(installation, "dist/index.js");
  if (!existsSync(entry)) {
    mkdirSync(root, { recursive: true, mode: 0o700 });
    const staging = mkdtempSync(join(root, ".install-"));
    try {
      const archive = join(staging, "release.tar.gz");
      const bundle = join(staging, "bundle");
      const asset = `${process.platform}.google-workspace-extension.tar.gz`;
      const url = `https://github.com/gemini-cli-extensions/workspace/releases/download/${version}/${asset}`;
      console.error(`Downloading official Google Workspace MCP ${version}...`);
      execFileSync(
        "curl",
        ["-fLsS", "--connect-timeout", "15", "--max-time", "60", url, "-o", archive],
        { stdio: ["ignore", "ignore", "inherit"] },
      );
      const actual = createHash("sha256")
        .update(readFileSync(archive))
        .digest("hex");
      if (actual !== digest) {
        throw new Error(`Official release checksum mismatch: ${asset}`);
      }
      mkdirSync(bundle, { mode: 0o700 });
      execFileSync("tar", ["-xzf", archive, "-C", bundle], {
        stdio: ["ignore", "ignore", "inherit"],
      });
      if (!existsSync(join(bundle, "dist/index.js"))) {
        throw new Error("Official release is missing dist/index.js.");
      }
      try {
        renameSync(bundle, installation);
      } catch (error) {
        // Another OpenCode directory may have installed the same release.
        if (
          !["EEXIST", "ENOTEMPTY"].includes(error.code) ||
          !existsSync(entry)
        ) {
          throw error;
        }
      }
    } finally {
      rmSync(staging, { recursive: true, force: true });
    }
  }

  process.chdir(installation);
  process.argv = [process.execPath, entry, ...process.argv.slice(2)];
  await import(pathToFileURL(entry).href);
} catch (error) {
  console.error(`Google Workspace MCP: ${error.message}`);
  process.exitCode = 1;
}
