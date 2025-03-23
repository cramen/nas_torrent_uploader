# Torrent Uploader

Torrent Uploader is a tool for convenient downloading of torrent files directly from trackers to your NAS (Network Attached Storage).

## Description

The program consists of two components:
1. **Server-side** — Docker container that runs on your NAS and receives uploaded torrent files
2. **Browser plugin** — adds "Upload to NAS" buttons next to torrent download links on tracker websites

**Important:** This tool only uploads torrent files to your NAS. To start downloading the actual torrents, you need to configure your torrent client (e.g., qBittorrent) to automatically pick up torrent files from the corresponding directories.

## Benefits

- Fast uploading of torrents directly to your NAS without downloading to your computer first
- Convenient selection of destination directory through a graphical interface
- Support for popular torrent trackers
- Simple setup and usage

## Server-side Installation (Docker Container)

### Prerequisites
- NAS with Docker support
- Docker and Docker Compose installed on your NAS

### Installation Steps

1. Place the server-side files in a chosen directory on your NAS.

2. Create a `docker-compose.yml` file:

```yaml
version: '3'
services:
  torrent-uploader:
    build: .
    container_name: torrent-uploader
    restart: unless-stopped
    ports:
      - "3300:3000"
    volumes:
      - /host/dir1:/targets/dir1
      - /host/dir2:/targets/dir2
      - /host/dir3:/targets/dir3
    environment:
      - PORT=3000
      - TOKEN=your_secret_token_here
```

3. Replace `/host/dir1`, `/host/dir2`, `/host/dir3` with the actual paths to directories on your NAS where torrent folders are stored. You can specify as many directories as needed.

4. Set a unique secret token in the `TOKEN` environment variable. This token will be used for authentication between the plugin and the server.

5. Build and start the Docker container:

```bash
docker-compose up -d
```

### Authentication

To protect the API from unauthorized access, a token-based authentication mechanism is used. The token is passed as an environment variable when starting the container.

- **Setting the token**: In `docker-compose.yml`, add the `TOKEN` environment variable:
  ```yaml
  environment:
    - PORT=3000
    - TOKEN=your_secret_token_here
  ```
  Replace `your_secret_token_here` with a unique secret token.

- **Token verification**: Each API request must include the `token` parameter in the query string, e.g.:
  ```
  GET /api/dirs?token=your_secret_token_here
  POST /api/upload?token=your_secret_token_here
  ```
  If the token is missing or incorrect, the server will return a 401 (`Unauthorized`) error.

# Torrent Uploader Plugin

The Torrent Uploader Plugin allows you to upload torrent files from trackers directly to your NAS.

## Browser Plugin Installation

### For Chrome/Edge:

1. Open `chrome://extensions/` (or `edge://extensions/`)
2. Enable "Developer mode" (toggle in the top right corner)
3. Click the "Load unpacked extension" button
4. Select the directory with the plugin files

### For Firefox:

1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select the `manifest.json` file from the plugin directory

## Plugin Configuration

After installing the plugin, you need to configure your NAS address and authentication token:

1. Click on the plugin icon in the browser toolbar
2. Click on the "Settings" link
3. Enter the correct URLs for your server:
   - URL for retrieving the directory list: `http://your-nas.local:3300/api/dirs`
   - URL for uploading torrent files: `http://your-nas.local:3300/api/upload`
4. Enter the authentication token in the "Authentication Token" field. This token must match the one set in the Docker container’s `TOKEN` environment variable.
5. Click the "Save" button

### Authentication Token

To securely interact with the API server, you need to provide an authentication token.

- **Setting the token**: In the plugin settings, enter the token that was set in the `TOKEN` environment variable when starting the Docker container.
- **How it works**: The plugin includes the token in every API request as a query parameter (e.g., `?token=your_secret_token_here`). If the token is incorrect or missing, the server will return a 401 (`Unauthorized`) error, and the operation will fail.

## Usage

1. Go to a torrent tracker website (e.g., rutracker.org)
2. Find the desired torrent
3. Next to the torrent download link, you'll see an "Upload to NAS" button
4. Click this button
5. Select the destination directory on your NAS (e.g., `dir1/sub1`) from the list of available subdirectories in the dialog window
6. Click "Upload"
7. You'll see a notification after successful upload

## Notes

- Your NAS must be accessible over the network from the computer where the plugin is installed
- By default, the server uses port 3300; if you change it, remember to update the settings in the plugin
- For proper operation, the directories specified in `docker-compose.yml` must exist on your NAS
- To automatically add uploaded torrents to your torrent client on the NAS, configure directory monitoring for the mounted directories in your torrent client (e.g., qBittorrent)
- The client now supports relative paths (e.g., `dir1/sub1`), allowing selection of subdirectories from multiple mounted directories