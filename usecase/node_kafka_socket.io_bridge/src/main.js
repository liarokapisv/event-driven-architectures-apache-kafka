"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_rdkafka_1 = require("node-rdkafka");
const convict_1 = __importDefault(require("convict"));
const yaml = __importStar(require("yaml"));
const socket_io_client_1 = __importDefault(require("socket.io-client"));
convict_1.default.addParser({ extension: ['yml', 'yaml'], parse: yaml.parse });
const conf = (0, convict_1.default)({
    kafka: {
        bootstrap_servers: {
            doc: "The initial list of kafka servers used to initiate the connection with the kafka cluster.",
            env: 'EMIEWEB__KAFKA__BOOTSTRAP_SERVERS',
            format: String,
            default: 'localhost:9092'
        },
        topic: {
            doc: "The actual topic used to bridge to the socket.io layer.",
            env: 'EMIEWEB__KAFKA__TOPIC',
            format: String,
            default: "endpoint_code_updates"
        },
        group_id: {
            doc: "The id for the kafka consumer group that the consumer instance belongs to.",
            env: 'EMIEWEB__KAFKA__GROUP_ID',
            format: String,
            default: ""
        },
        poll_timeout: {
            doc: "The timeout value in seconds used for the internal poll method.",
            env: 'EMIEWEB__KAFKA__POLL_TIMEOUT',
            format: Number,
            default: 1.0
        }
    },
    socket_io: {
        server: {
            doc: "The socket.io server to bridge to.",
            env: 'EMIEWEB__SOCKET_IO__SERVER',
            format: String,
            default: "http://localhost:4444"
        },
        message_tag: {
            doc: "The message tag used when sending the data to the socket.io server",
            env: 'EMIEWEB__SOCKET_IO__MESSAGE_TAG',
            format: String,
            default: "endpoind_code_updates"
        }
    }
});
conf.validate({ strict: true });
conf.validate({ allowed: "strict" });
conf.validate({ allowed: "warn" });
conf.validate({ output: console.warn });
conf.loadFile('./config/settings.yaml');
console.log("kafka.bootstrap_servers", conf.get("kafka.bootstrap_servers"));
console.log("kafka.topic", conf.get("kafka.topic"));
console.log("kafka.group_id", conf.get("kafka.group_id"));
console.log("kafka.poll_timeout", conf.get("kafka.poll_timeout"));
console.log("socket_io.server", conf.get("socket_io.server"));
console.log("socket_io.message_tag", conf.get("socket_io.message_tag"));
var consumer = new node_rdkafka_1.KafkaConsumer({
    'bootstrap.servers': conf.get("kafka.bootstrap_servers"),
    'group.id': conf.get("kafka.group_id"),
    'enable.auto.commit': false
}, {});
const socket = (0, socket_io_client_1.default)(conf.get("socket_io.server"));
consumer.on('event.log', log => {
    console.log(log);
});
consumer.on('event.error', err => {
    console.error('Error from consumer');
    console.error(err);
});
consumer.on('ready', arg => {
    console.log('consumer ready.' + JSON.stringify(arg));
    consumer.subscribe([conf.get('kafka.topic')]);
    consumer.consume();
});
consumer.on('data', (msg) => {
    var _a;
    console.log(msg);
    const rep = (_a = msg === null || msg === void 0 ? void 0 : msg.value) === null || _a === void 0 ? void 0 : _a.toString("utf8");
    try {
        if (rep !== null && rep !== undefined) {
            const json = JSON.parse(rep);
            socket.emit(conf.get("socket_io.message_tag"), json);
            console.log(json);
            consumer.commit();
        }
    }
    catch (err) {
        console.error(err);
    }
});
const errorTypes = ['unhandledRejection', 'uncaughtException'];
const signalTraps = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
errorTypes.map(type => {
    process.on(type, (e) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            console.log(`process.on ${type}`);
            console.error(e);
            yield consumer.disconnect();
            process.exit(0);
        }
        catch (_) {
            process.exit(1);
        }
    }));
});
signalTraps.map(type => {
    process.once(type, () => __awaiter(void 0, void 0, void 0, function* () {
        try {
            yield consumer.disconnect();
        }
        finally {
            process.kill(process.pid, type);
        }
    }));
});
consumer.connect();
