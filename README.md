# Video Meet

Video Meet is a peer-to-peer (P2P) video conferencing web application built using the MERN stack and WebRTC. It enables users to create, schedule, and join meetings seamlessly with video, audio, and screen-sharing capabilities.

## Features

- **Create Meeting**: Users must enter their name to create a meeting.
- **Schedule Meeting**: If a user joins before the scheduled time, a prompt appears showing the time left.
- **Join Meeting**: Users can join a meeting using a meeting code. The meeting creator can copy and share the link with others for direct access.
- **Video & Audio Support**: Allows real-time video and audio communication.
- **Screen Sharing**: Users can share their screens during the meeting.

## Tech Stack

- **Frontend**: React.js
- **Backend**: Node.js, Express.js, MongoDB
- **WebRTC**: Used for peer-to-peer video and audio streaming.

## Installation & Setup

1. **Clone the repository**:
   ```sh
   git clone https://github.com/AbdulMoiz2493/P2P_Video-Meet.git
   cd P2P_Video-Meet
   ```

2. **Set up the backend (server)**:
   ```sh
   cd server
   npm install
   ```

3. **Set up the frontend (client)**:
   ```sh
   cd client
   npm install
   ```

4. **Run both frontend and backend**:
   ```sh
   npm run dev
   ```

## Environment Variables

Create a `.env` file in the `server` directory and add the following:
```env
PORT=4000
MONGO_DB_URL='your_mongodb_connection_string'
FRONTEND_URL='your_frontend_url'
```

## Contributing

Contributions are welcome! To collaborate:
1. Fork the repository.
2. Create a new branch (`git checkout -b feature-branch`).
3. Commit your changes (`git commit -m 'Add new feature'`).
4. Push to the branch (`git push origin feature-branch`).
5. Open a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Repository

GitHub: [P2P Video Meet](https://github.com/AbdulMoiz2493/P2P_Video-Meet)

## Contact

For any queries or support, reach out via email: **abdulmoiz8895@gmail.com**

