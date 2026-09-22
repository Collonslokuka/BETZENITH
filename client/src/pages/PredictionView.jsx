// src/pages/PredictionView.jsx
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/axios';

export default function PredictionView() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get(`/admin-panel/predict/${slug}`)
      .then(r => setData(r.data.data))
      .catch(e => setError(e.response?.data?.message || 'Not found'))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>;
  if (error) return (
    <div className="max-w-md mx-auto py-20 text-center">
      <p className="text-red-400 mb-4">{error}</p>
      <Link to="/" className="text-[#2e7d32]">Home</Link>
    </div>
  );

  const { prediction, match } = data;
  const winnerLabel = prediction.predictedWinner === 'HOME' ? match.homeTeam.name
                    : prediction.predictedWinner === 'AWAY' ? match.awayTeam.name
                    : 'Draw';

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="mb-6 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
        <p className="text-yellow-400 text-xs text-center font-bold">⚠️ DEMO PREDICTION — Not affiliated with any real betting service</p>
      </div>

      <div className="bg-[#1a1f2e] rounded-2xl p-8 border-2 border-[#2e7d32]/30">
        <div className="text-center mb-6">
          <span className="text-xs bg-[#2e7d32]/10 text-[#2e7d32] px-3 py-1 rounded-full">AI PREDICTION</span>
        </div>

        <div className="text-center mb-8">
          <div className="text-sm text-gray-500 mb-2">{match.league}</div>
          <div className="text-3xl font-bold text-white mb-2">{match.homeTeam.name} vs {match.awayTeam.name}</div>
          <div className="text-sm text-gray-400">{new Date(match.startsAt).toLocaleString()}</div>
        </div>

        <div className="bg-[#0f1219] rounded-xl p-6 mb-6 text-center">
          <div className="text-xs text-gray-500 mb-2">PREDICTED RESULT</div>
          <div className="text-2xl font-bold text-[#2e7d32] mb-1">{prediction.predictedScore}</div>
          <div className="text-lg text-white">{winnerLabel} to win</div>
        </div>

        {prediction.note && (
          <div className="bg-[#0f1219] rounded-xl p-4 mb-6">
            <div className="text-xs text-gray-500 mb-1">ANALYSIS</div>
            <div className="text-sm text-gray-300">{prediction.note}</div>
          </div>
        )}

        <div className="text-xs text-gray-500 text-center">
          Issued {new Date(prediction.issuedAt).toLocaleString()}
        </div>
      </div>

      <Link to="/" className="block text-center mt-6 text-[#2e7d32] text-sm">← Back to BetZenith</Link>
    </div>
  );
}