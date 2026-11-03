from pathlib import Path
import subprocess
subprocess.run(["node", "build.mjs"], cwd=Path(__file__).parent, check=True)
