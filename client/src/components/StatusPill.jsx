import { Database, WifiOff } from 'lucide-react';

export default function StatusPill({ status }) {
  if (!status) return <span className="status-pill status-checking"><span className="status-dot" />Checking local API</span>;
  if (status.offline) return <span className="status-pill status-offline"><WifiOff size={13} />API offline</span>;
  if (status.database === 'disconnected') return <span className="status-pill status-offline"><WifiOff size={13} />Mongo reconnecting</span>;
  return (
    <span className={`status-pill ${status.storage === 'mongodb' ? 'status-live' : 'status-demo'}`} title={status.storage === 'memory' ? 'Posts reset when the server stops. Add MONGODB_URI for persistence.' : 'Posts are stored in MongoDB.'}>
      <Database size={13} />{status.storage === 'mongodb' ? 'Mongo connected' : 'Demo memory'}
    </span>
  );
}

