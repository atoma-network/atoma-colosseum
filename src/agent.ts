import http from "http";
import app from "./app";
const server = http.createServer(app);
import atomaSDK from "./config/atoma";
import config from "./config/config";
import { AtomaSDK } from "atoma-sdk";
class Main {
  private atoma: AtomaSDK;
  private port: string | number;
  constructor(port: string | number) {
    this.port = port;
    this.atoma = atomaSDK;
  }
  private async health() {
    const data = await this.atoma.health.health();
    console.log(data);
  }
  start() {
    server.listen(this.port, () => {
      (async () => {
        await this.health();
      })();
      console.log(`server is listening on port ${this.port}`);
    });
  }
}
new Main(config.port).start();
