# LivePlay development recipes

# Disable Electron sandbox on Linux (requires root-owned SUID binary otherwise)
electron_sandbox_env := if os() == "linux" { "ELECTRON_DISABLE_SANDBOX=1" } else { "" }

# List available recipes
default:
    @just --list

# Install client dependencies
install:
    cd client && npm install

# Ensure client node_modules are installed
_ensure-deps:
    @[ -d client/node_modules ] || (cd client && npm install)

# Start dev mode (Nuxt + Electron) — always run from repo root
dev: _ensure-deps
    cd client && npx concurrently "npm run dev:nuxt" "{{electron_sandbox_env}} npm run dev:electron"

# Start dev mode with a project auto-opened and CDP debugging enabled
dev-debug project_path="" cdp_port="9222": _ensure-deps
    cd client && npx concurrently \
        "npm run dev:nuxt" \
        "wait-on http://localhost:3000 && {{electron_sandbox_env}} LIVEPLAY_PROJECT={{project_path}} npx electron . --remote-debugging-port={{cdp_port}}"

# Start only the Nuxt dev server
dev-nuxt:
    cd client && npm run dev:nuxt

# Start only Electron (requires Nuxt already running on :3000)
dev-electron:
    cd client && {{electron_sandbox_env}} npm run dev:electron

# Build Nuxt static output (production)
build:
    cd client && npm run build

# Build distributable Electron app
build-electron:
    cd client && npm run build:electron

# Generate Nuxt static output
generate:
    cd client && npm run generate

# Preview Nuxt build
preview:
    cd client && npm run preview

# Build the C++ server binary via Docker (output: server/build/liveplay-server)
build-server:
    mkdir -p server/build
    docker build -f server/Dockerfile.build -t liveplay-server-builder .
    docker run --rm -v "$(pwd)/server/build:/out" liveplay-server-builder

# Build C++ server in debug mode via Docker (output: server/dist/liveplay-server-debug)
build-server-debug:
    mkdir -p server/dist
    docker build -f server/Dockerfile.build -t liveplay-server-builder .
    docker run --rm -v "$(pwd)/server/dist:/out" \
        -e CMAKE_BUILD_TYPE=Debug \
        liveplay-server-builder \
        sh -c "cmake -S server -B server/build-debug -G Ninja -DCMAKE_BUILD_TYPE=Debug \
               -DVCPKG_TARGET_TRIPLET=x64-linux \
               -DCMAKE_TOOLCHAIN_FILE=/vcpkg/scripts/buildsystems/vcpkg.cmake \
            && cmake --build server/build-debug --parallel \
            && cp server/build-debug/liveplay-server /out/liveplay-server-debug \
            && echo 'Debug build complete'"

# Format markdown files
format-md +files:
    npx --yes prettier@3 --write {{files}}

# Check markdown formatting without writing
format-md-check +files:
    npx --yes prettier@3 --check {{files}}
