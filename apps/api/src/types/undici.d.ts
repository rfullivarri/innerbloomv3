declare module 'undici' {
  interface AgentOptions {
    keepAliveTimeout?: number;
    keepAliveTimeoutThreshold?: number;
    connections?: number;
    pipelining?: number;
  }

  export class Agent {
    constructor(options?: AgentOptions);
  }
}
