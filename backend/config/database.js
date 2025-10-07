import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * MongoDB Connection Configuration
 * Handles database connection with robust error handling and reconnection logic
 */

class Database {
  constructor() {
    this.isConnected = false;
    this.retryCount = 0;
    this.maxRetries = 5;
    this.retryDelay = 5000; // 5 seconds
  }

  /**
   * Connect to MongoDB with retry logic
   */
  async connect() {
    try {
      const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bookifyme';
      
      // Connection options for better performance and stability
      const options = {
        maxPoolSize: 10, // Maintain up to 10 socket connections
        serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        family: 4, // Use IPv4, skip trying IPv6
        retryWrites: true,
        w: 'majority'
      };

      console.log('📦 Connecting to MongoDB...');
      console.log(`🔗 URI: ${MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`); // Hide credentials in logs

      await mongoose.connect(MONGODB_URI, options);
      
      this.isConnected = true;
      this.retryCount = 0;
      
      console.log('✅ MongoDB Connected Successfully!');
      console.log(`📊 Database: ${mongoose.connection.db.databaseName}`);
      console.log(`🎯 Host: ${mongoose.connection.host}`);
      console.log(`🔌 Port: ${mongoose.connection.port}`);
      
      this.setupEventListeners();
      
    } catch (error) {
      console.error('❌ MongoDB Connection Error:', error.message);
      
      // Implement retry logic
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.log(`🔄 Retrying connection in ${this.retryDelay/1000} seconds... (Attempt ${this.retryCount}/${this.maxRetries})`);
        
        setTimeout(() => {
          this.connect();
        }, this.retryDelay);
      } else {
        console.error('💥 Maximum connection retries reached. Exiting application...');
        process.exit(1);
      }
    }
  }

  /**
   * Setup MongoDB event listeners
   */
  setupEventListeners() {
    // When successfully connected
    mongoose.connection.on('connected', () => {
      console.log('🔗 Mongoose connected to MongoDB');
      this.isConnected = true;
    });

    // When connection is disconnected
    mongoose.connection.on('disconnected', () => {
      console.log('🔌 Mongoose disconnected from MongoDB');
      this.isConnected = false;
      
      // Attempt to reconnect
      if (!this.isConnected) {
        console.log('🔄 Attempting to reconnect to MongoDB...');
        setTimeout(() => {
          this.connect();
        }, this.retryDelay);
      }
    });

    // When connection throws an error
    mongoose.connection.on('error', (error) => {
      console.error('❌ Mongoose connection error:', error);
      this.isConnected = false;
    });

    // When the connection is reconnected
    mongoose.connection.on('reconnected', () => {
      console.log('🔄 Mongoose reconnected to MongoDB');
      this.isConnected = true;
    });

    // If the Node process ends, close the Mongoose connection
    process.on('SIGINT', this.gracefulExit);
    process.on('SIGTERM', this.gracefulExit);
  }

  /**
   * Gracefully close the MongoDB connection
   */
  async gracefulExit() {
    try {
      await mongoose.connection.close();
      console.log('👋 MongoDB connection closed through app termination');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during graceful exit:', error);
      process.exit(1);
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      retryCount: this.retryCount,
      maxRetries: this.maxRetries,
      host: mongoose.connection?.host || 'Unknown',
      database: mongoose.connection?.db?.databaseName || 'Unknown',
      readyState: mongoose.connection?.readyState || 0 // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    };
  }

  /**
   * Health check for database connection
   */
  async healthCheck() {
    try {
      if (!this.isConnected) {
        return {
          status: 'disconnected',
          message: 'Database is not connected'
        };
      }

      // Run a simple query to check database responsiveness
      await mongoose.connection.db.admin().ping();
      
      return {
        status: 'healthy',
        message: 'Database connection is healthy',
        details: this.getConnectionStatus()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Database health check failed',
        error: error.message,
        details: this.getConnectionStatus()
      };
    }
  }

  /**
   * Close database connection
   */
  async close() {
    try {
      await mongoose.connection.close();
      this.isConnected = false;
      console.log('🔌 MongoDB connection closed successfully');
    } catch (error) {
      console.error('❌ Error closing MongoDB connection:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
const database = new Database();

export default database;

// Also export individual methods for flexibility
export const connectDB = () => database.connect();
export const disconnectDB = () => database.close();
export const getDBStatus = () => database.getConnectionStatus();
export const healthCheck = () => database.healthCheck();