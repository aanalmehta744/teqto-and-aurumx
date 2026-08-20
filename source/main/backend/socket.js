let io;

const initializeSocket = (socketIoInstance) => {
  io = socketIoInstance;
};

const getIO = () => {
  if (!io) {
    throw new Error(
      "Socket.io not initialized"
    );
  }

  return io;
};

module.exports = {
  initializeSocket,
  getIO
};