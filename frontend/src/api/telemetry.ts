import { apiClient } from './client';

export const sendTelemetry = (event: string, songId?: string, emotion?: string, sessionTime?: number) => {
    // Fire and forget
    apiClient.post('/telemetry/', {
        event,
        song_id: songId,
        emotion,
        session_time: sessionTime
    }).catch(() => {});
};
