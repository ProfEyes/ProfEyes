import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface StreamData {
  id: string;
  title: string;
  status: string;
  user_id: string;
  peer_id?: string;
  started_at?: string;
  created_at: string;
  username?: string;
}

interface DiagnosticsData {
  database: {
    live_streams_exists?: boolean;
    live_streams_error?: string;
    peer_id_column_exists?: boolean;
  };
  permissions: {
    authenticated?: boolean;
    userId?: string;
    myStreamsCount?: number;
    myStreams?: StreamData[];
  };
  liveStreams: StreamData[];
  activeStreams?: StreamData[];
  activeStreamsCount?: number;
  recommendations: string[];
  peerjs_loaded?: boolean;
  error?: string;
}

export default function StreamDebug() {
  const { user } = useAuth();
  const [checking, setChecking] = useState(false);
  const [results, setResults] = useState<DiagnosticsData | null>(null);

  const runDiagnostics = async () => {
    setChecking(true);
    const diagnostics: DiagnosticsData = {
      database: {},
      permissions: {},
      liveStreams: [],
      recommendations: []
    };

    try {
      // 1. Verificar se tabela live_streams existe
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: tableCheck, error: tableError } = await (supabase as any)
        .from('live_streams')
        .select('id')
        .limit(1);

      diagnostics.database.live_streams_exists = !tableError;
      if (tableError) {
        diagnostics.database.live_streams_error = tableError.message;
      }

      // 2. Verificar se coluna peer_id existe
      if (!tableError) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: streams } = await (supabase as any)
          .from('live_streams')
          .select('id, title, status, user_id, peer_id, started_at, created_at')
          .order('created_at', { ascending: false })
          .limit(5);

        diagnostics.liveStreams = streams || [];
        
        const hasPeerIdColumn = streams && streams.length > 0 && 'peer_id' in streams[0];
        diagnostics.database.peer_id_column_exists = hasPeerIdColumn;
        
        if (!hasPeerIdColumn && streams && streams.length > 0) {
          diagnostics.recommendations.push('❌ Coluna peer_id não existe! Execute a migration.');
        }
      }

      // 3. Verificar streams ativas
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: activeStreams } = await (supabase as any)
        .from('live_streams')
        .select('*')
        .eq('status', 'live');

      diagnostics.activeStreamsCount = activeStreams?.length || 0;
      diagnostics.activeStreams = activeStreams || [];

      // 4. Verificar se há streams sem peer_id
      const streamsWithoutPeerId = activeStreams?.filter(s => !s.peer_id) || [];
      if (streamsWithoutPeerId.length > 0) {
        diagnostics.recommendations.push(
          `⚠️ ${streamsWithoutPeerId.length} stream(s) ativa(s) SEM peer_id! O streamer não iniciou a transmissão.`
        );
      }

      // 5. Verificar permissões do usuário
      if (user) {
        diagnostics.permissions.authenticated = true;
        diagnostics.permissions.userId = user.id;
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: myStreams } = await (supabase as any)
          .from('live_streams')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(3);
        
        diagnostics.permissions.myStreamsCount = myStreams?.length || 0;
        diagnostics.permissions.myStreams = myStreams || [];
      } else {
        diagnostics.permissions.authenticated = false;
        diagnostics.recommendations.push('❌ Usuário não autenticado!');
      }

      // 6. Verificar PeerJS availability
      try {
        // @ts-expect-error - PeerJS não tem tipos TypeScript
        if (typeof window.Peer !== 'undefined') {
          diagnostics.peerjs_loaded = true;
        } else {
          diagnostics.peerjs_loaded = false;
          diagnostics.recommendations.push('❌ PeerJS não carregado!');
        }
      } catch {
        diagnostics.peerjs_loaded = false;
      }

      // Recommendations summary
      if (diagnostics.recommendations.length === 0) {
        diagnostics.recommendations.push('✅ Tudo configurado corretamente!');
      }

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      diagnostics.error = errorMessage;
      diagnostics.recommendations.push(`❌ Erro: ${errorMessage}`);
    }

    setResults(diagnostics);
    setChecking(false);
  };

  useEffect(() => {
    runDiagnostics();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // runDiagnostics é estável e não precisa estar nas dependências

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-black p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">🔧 Debug de Streaming</h1>
          <Button onClick={runDiagnostics} disabled={checking}>
            <RefreshCw className={`w-4 h-4 mr-2 ${checking ? 'animate-spin' : ''}`} />
            Verificar Novamente
          </Button>
        </div>

        {results && (
          <>
            {/* Recomendações */}
            <Card className="bg-zinc-800/50 border-zinc-700 p-6">
              <h2 className="text-xl font-bold text-white mb-4">📋 Recomendações</h2>
              <div className="space-y-2">
                {results.recommendations.map((rec: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-2">
                    {rec.startsWith('✅') && <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />}
                    {rec.startsWith('⚠️') && <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />}
                    {rec.startsWith('❌') && <XCircle className="w-5 h-5 text-red-500 mt-0.5" />}
                    <span className="text-zinc-300">{rec}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Status do Banco de Dados */}
            <Card className="bg-zinc-800/50 border-zinc-700 p-6">
              <h2 className="text-xl font-bold text-white mb-4">💾 Banco de Dados</h2>
              <div className="space-y-2">
                <StatusLine 
                  label="Tabela live_streams" 
                  status={results.database.live_streams_exists} 
                />
                <StatusLine 
                  label="Coluna peer_id" 
                  status={results.database.peer_id_column_exists} 
                />
                {results.database.live_streams_error && (
                  <div className="text-red-400 text-sm mt-2">
                    Erro: {results.database.live_streams_error}
                  </div>
                )}
              </div>
            </Card>

            {/* Streams Ativas */}
            <Card className="bg-zinc-800/50 border-zinc-700 p-6">
              <h2 className="text-xl font-bold text-white mb-4">
                📡 Streams Ativas ({results.activeStreamsCount})
              </h2>
              {results.activeStreamsCount === 0 ? (
                <p className="text-zinc-400">Nenhuma stream ativa no momento</p>
              ) : (
                <div className="space-y-3">
                  {results.activeStreams?.map((stream) => (
                    <div key={stream.id} className="bg-zinc-900/50 border border-zinc-700 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="text-white font-medium">{stream.title}</h3>
                          <p className="text-zinc-400 text-sm">Por: {stream.username}</p>
                        </div>
                        {stream.peer_id ? (
                          <span className="bg-green-900/50 text-green-300 px-2 py-1 rounded text-xs">
                            ✓ Com PeerID
                          </span>
                        ) : (
                          <span className="bg-red-900/50 text-red-300 px-2 py-1 rounded text-xs">
                            ✗ Sem PeerID
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-zinc-500">Stream ID:</span>
                          <span className="text-zinc-300 ml-2 font-mono text-xs">
                            {stream.id.slice(0, 8)}...
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-500">User ID:</span>
                          <span className="text-zinc-300 ml-2 font-mono text-xs">
                            {stream.user_id.slice(0, 8)}...
                          </span>
                        </div>
                        {stream.peer_id && (
                          <div className="col-span-2">
                            <span className="text-zinc-500">Peer ID:</span>
                            <span className="text-green-300 ml-2 font-mono text-xs">
                              {stream.peer_id}
                            </span>
                          </div>
                        )}
                        {stream.started_at && (
                          <div className="col-span-2">
                            <span className="text-zinc-500">Iniciada:</span>
                            <span className="text-zinc-300 ml-2 text-xs">
                              {new Date(stream.started_at).toLocaleString('pt-BR')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Permissões do Usuário */}
            <Card className="bg-zinc-800/50 border-zinc-700 p-6">
              <h2 className="text-xl font-bold text-white mb-4">👤 Usuário Atual</h2>
              <div className="space-y-2">
                <StatusLine 
                  label="Autenticado" 
                  status={results.permissions.authenticated} 
                />
                {results.permissions.authenticated && (
                  <>
                    <div className="text-zinc-300 text-sm">
                      <span className="text-zinc-500">User ID:</span>
                      <span className="ml-2 font-mono">{results.permissions.userId?.slice(0, 16)}...</span>
                    </div>
                    <div className="text-zinc-300 text-sm">
                      <span className="text-zinc-500">Minhas Streams:</span>
                      <span className="ml-2">{results.permissions.myStreamsCount}</span>
                    </div>
                  </>
                )}
              </div>
            </Card>

            {/* Últimas 5 Streams */}
            {results.liveStreams.length > 0 && (
              <Card className="bg-zinc-800/50 border-zinc-700 p-6">
                <h2 className="text-xl font-bold text-white mb-4">
                  📜 Últimas Streams Criadas
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-700">
                        <th className="text-left text-zinc-400 pb-2">Título</th>
                        <th className="text-left text-zinc-400 pb-2">Status</th>
                        <th className="text-left text-zinc-400 pb-2">Peer ID</th>
                        <th className="text-left text-zinc-400 pb-2">Criada</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.liveStreams.map((stream) => (
                        <tr key={stream.id} className="border-b border-zinc-800">
                          <td className="py-2 text-zinc-300">{stream.title}</td>
                          <td className="py-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              stream.status === 'live' ? 'bg-green-900/50 text-green-300' :
                              stream.status === 'ended' ? 'bg-zinc-700/50 text-zinc-400' :
                              'bg-blue-900/50 text-blue-300'
                            }`}>
                              {stream.status}
                            </span>
                          </td>
                          <td className="py-2 text-zinc-400 font-mono text-xs">
                            {stream.peer_id || '(vazio)'}
                          </td>
                          <td className="py-2 text-zinc-400 text-xs">
                            {new Date(stream.created_at).toLocaleDateString('pt-BR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </>
        )}

        {checking && (
          <div className="text-center py-8">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-2" />
            <p className="text-zinc-400">Verificando sistema...</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusLine({ label, status }: { label: string; status: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {status ? (
        <CheckCircle className="w-5 h-5 text-green-500" />
      ) : (
        <XCircle className="w-5 h-5 text-red-500" />
      )}
      <span className="text-zinc-300">{label}</span>
      <span className={status ? 'text-green-400' : 'text-red-400'}>
        {status ? 'OK' : 'Falhou'}
      </span>
    </div>
  );
}
