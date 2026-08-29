import * as functions from 'firebase-functions';
export declare const healthCheck: functions.https.CallableFunction<any, Promise<{
    status: string;
    timestamp: string;
    version: string;
    environment: string;
}>, unknown>;
//# sourceMappingURL=index.d.ts.map