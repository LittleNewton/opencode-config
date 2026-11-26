(
        set -e
        platform="$(uname -s | tr '[:upper:]' '[:lower:]')"
        dir="$HOME/.local/share/opencode/google-workspace-official/server"
        tmp="$(mktemp -d)"
        trap 'rm -rf "$tmp"' EXIT

        curl -fL \
                "https://github.com/gemini-cli-extensions/workspace/releases/latest/download/${platform}.google-workspace-extension.tar.gz" \
                -o "$tmp/workspace.tar.gz"

        mkdir -p -m 700 "$dir"
        tar -xzf "$tmp/workspace.tar.gz" -C "$dir"
)