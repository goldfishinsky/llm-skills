import { MCPServerConfig } from './types';

// Type imports only - actual modules loaded dynamically
type Client = any;
type StdioClientTransport = any;

export class MCPClient {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private serverConfig: MCPServerConfig;
  private isConnected: boolean = false;
  private ClientClass: any = null;
  private TransportClass: any = null;

  constructor(serverConfig: MCPServerConfig) {
    this.serverConfig = serverConfig;
  }

  async connect(): Promise<void> {
    if (this.isConnected) {
      console.log('MCP client already connected');
      return;
    }

    try {
      console.log(`Starting MCP server: ${this.serverConfig.command} ${this.serverConfig.args.join(' ')}`);
      
      // Dynamically import MCP SDK (ES Module) using eval to bypass TypeScript's module transformation
      // This ensures the import() is preserved at runtime instead of being converted to require()
      if (!this.ClientClass || !this.TransportClass) {
        const dynamicImport = new Function('specifier', 'return import(specifier)');
        
        const clientModule = await dynamicImport('@modelcontextprotocol/sdk/client/index.js');
        const stdioModule = await dynamicImport('@modelcontextprotocol/sdk/client/stdio.js');
        
        this.ClientClass = clientModule.Client;
        this.TransportClass = stdioModule.StdioClientTransport;
        
        console.log('MCP SDK loaded successfully');
      }

      // Create transport using command and args
      const envVars = { ...process.env, ...this.serverConfig.env };
      const cleanEnv = Object.fromEntries(
        Object.entries(envVars).filter(([_, v]) => v !== undefined)
      ) as Record<string, string>;
      
      this.transport = new this.TransportClass({
        command: this.serverConfig.command,
        args: this.serverConfig.args,
        env: cleanEnv
      });

      this.client = new this.ClientClass({
        name: 'llm-skills-client',
        version: '1.0.0'
      }, {
        capabilities: {}
      });

      // Connect to the server
      await this.client.connect(this.transport);
      this.isConnected = true;
      console.log('MCP client connected successfully');
    } catch (error) {
      console.error('Error connecting to MCP server:', error);
      this.cleanup();
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.cleanup();
  }

  private cleanup(): void {
    if (this.client) {
      this.client.close();
      this.client = null;
    }
    this.transport = null;
    this.isConnected = false;
    console.log('MCP client disconnected');
  }

  async callTool(name: string, args: Record<string, any>): Promise<any> {
    if (!this.isConnected || !this.client) {
      throw new Error('MCP client not connected. Call connect() first.');
    }

    try {
      console.log(`Calling MCP tool: ${name}`, args);
      const result = await this.client.callTool({
        name,
        arguments: args
      });
      
      return result;
    } catch (error) {
      console.error(`Error calling MCP tool ${name}:`, error);
      throw error;
    }
  }

  async listTools(): Promise<any[]> {
    if (!this.isConnected || !this.client) {
      throw new Error('MCP client not connected. Call connect() first.');
    }

    try {
      const response = await this.client.listTools();
      return response.tools;
    } catch (error) {
      console.error('Error listing MCP tools:', error);
      throw error;
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}
