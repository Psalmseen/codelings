import { useNavigate } from 'react-router';
import PracticeRound from '../../components/player/PracticeRound';

export default function PracticePage() {
  const navigate = useNavigate();
  const home = () => navigate('/learn');
  return <PracticeRound onClose={home} onDone={home} />;
}
