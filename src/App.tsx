import { AetherTamboProvider } from './tambo/provider';
import ChatContainer from './components/chat/ChatContainer';
import './index.css';

function App() {
  return (
    <AetherTamboProvider>
      <main className="min-h-screen">
        <ChatContainer />
      </main>
    </AetherTamboProvider>
  );
}

export default App;
