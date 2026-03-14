# Sistema de Streaming Ultra Minimalista

## 🎨 Design System

### Princípios de Design
- **Ultra Minimalismo**: Elementos essenciais apenas
- **Espaçamento Generoso**: Ar e respiração entre elementos
- **Transparências Sutis**: Opacidades de 2%, 3%, 4%, 5%, 6%, 8%
- **Bordas Delicadas**: 0.5px com gradientes
- **Tipografia Leve**: font-extralight e font-light
- **Bordas Arredondadas**: 2xl (16px) e 3xl (24px)
- **Animações Fluidas**: cubic-bezier(0.16, 1, 0.3, 1)
- **Sem Cores Chamativas**: Apenas branco/cinza, exceto vermelho para bloqueios

### Paleta de Cores
- **Background**: Gradiente de preto (from-black/98 to-black/95)
- **Elementos**: white/[0.02] a white/[0.08]
- **Texto Principal**: white/90 a white/95
- **Texto Secundário**: white/30 a white/60
- **Accent Neutro**: white/90 (switches, botões)
- **Destaque Urgente**: red-400/80 (bloqueios apenas)

## 📦 Componentes

### 1. MinimalChat
Chat ultra limpo com scrollbar customizada.

**Features:**
- Header com contador de viewers
- Mensagens com avatares e badge de host (coroa dourada)
- Scrollbar ultra sutil (3px)
- Input arredondado com botão integrado
- Divisores em gradiente

**Props:**
```typescript
interface MinimalChatProps {
  messages: Message[];
  onSendMessage: (content: string) => void;
  currentUserId: string;
  viewerCount: number;
  isStreamer?: boolean;
}
```

### 2. ViewersControlPanel
Painel de controle de viewers adicionados (exclusivo para streamer).

**Features:**
- 3 cards de estatísticas (Real, Boost, Total)
- Botões de ajuste rápido (-100, -10, Reset, +10, +100)
- Input customizado com validação
- Aviso informativo
- Hover states em todos os elementos

**Props:**
```typescript
interface ViewersControlPanelProps {
  streamId: string;
  realViewers: number;
  onViewersUpdate?: (total: number, added: number) => void;
}
```

### 3. EndStreamButton
Botão minimalista para encerrar transmissão com modal de confirmação.

**Features:**
- Botão com ícone Power
- Modal com estatísticas (Duração, Pico, Mensagens)
- Animações de entrada (fade-in, zoom-in)
- Confirmação destacada em vermelho

**Props:**
```typescript
interface EndStreamButtonProps {
  onEndStream: () => void;
  isEnding?: boolean;
  streamDuration?: string;
  peakViewers?: number;
  totalMessages?: number;
}
```

### 4. StreamSettingsPanel ⭐ **NOVO**
Painel completo de configurações seguindo 100% o padrão Admin.

**Features:**
- **Design Ultra Minimalista**: Inspirado na página Admin
- **Ícones Discretos**: Circle, MessageCircle, TrendingUp, AlertCircle
- **Inputs Clean**: rounded-2xl, opacidade 2-4%
- **Labels Uppercase**: tracking-widest, font-extralight, 11px
- **Cards de Estatísticas**: 4 cards com hover effect
- **Switch Neutro**: Branco ao invés de cores vibrantes
- **Bloqueados em Destaque**: Único uso de vermelho (red-400/80)
- **Scrollbar Customizada**: minimal-scrollbar class
- **Gradientes Sutis**: Divisores horizontais 0.5px
- **Botões Minimalistas**: rounded-2xl, white/[0.03]

**Props:**
```typescript
interface StreamSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  streamId?: string;
  
  // Informações básicas
  streamTitle: string;
  setStreamTitle: (value: string) => void;
  streamDescription: string;
  setStreamDescription: (value: string) => void;
  streamLanguage: string;
  setStreamLanguage: (value: string) => void;
  streamTags: string;
  setStreamTags: (value: string) => void;
  
  // Controles do chat
  chatEnabled: boolean;
  setChatEnabled: (value: boolean) => void;
  chatDelaySeconds: number;
  setChatDelaySeconds: (value: number) => void;
  subscribersOnly: boolean;
  setSubscribersOnly: (value: boolean) => void;
  linksAllowed: boolean;
  setLinksAllowed: (value: boolean) => void;
  
  // Estatísticas
  viewerCount: number;
  peakViewers: number;
  duration: number;
  totalMessages: number;
  
  // Ação de salvar
  onSave: () => void;
  isSaving?: boolean;
}
```

## 🎯 Exemplo de Integração StreamSettingsPanel

```tsx
import { StreamSettingsPanel } from '@/components/streaming/StreamSettingsPanel';

export const StreamerDashboard = () => {
  const [showStreamSettings, setShowStreamSettings] = useState(false);
  const [streamTitle, setStreamTitle] = useState('');
  const [streamDescription, setStreamDescription] = useState('');
  const [streamLanguage, setStreamLanguage] = useState('pt');
  const [streamTags, setStreamTags] = useState('');
  const [chatEnabled, setChatEnabled] = useState(true);
  const [chatDelaySeconds, setChatDelaySeconds] = useState(0);
  const [subscribersOnly, setSubscribersOnly] = useState(false);
  const [linksAllowed, setLinksAllowed] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateStream(streamId, {
        title: streamTitle,
        description: streamDescription,
        language: streamLanguage,
        tags: streamTags.split(',').map(t => t.trim()).filter(t => t)
      });
      toast.success('Configurações salvas!');
      setShowStreamSettings(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {/* Botão para abrir configurações */}
      <button onClick={() => setShowStreamSettings(true)}>
        Configurações
      </button>

      {/* Painel de configurações */}
      <StreamSettingsPanel
        isOpen={showStreamSettings}
        onClose={() => setShowStreamSettings(false)}
        streamId={streamId}
        
        streamTitle={streamTitle}
        setStreamTitle={setStreamTitle}
        streamDescription={streamDescription}
        setStreamDescription={setStreamDescription}
        streamLanguage={streamLanguage}
        setStreamLanguage={setStreamLanguage}
        streamTags={streamTags}
        setStreamTags={setStreamTags}
        
        chatEnabled={chatEnabled}
        setChatEnabled={setChatEnabled}
        chatDelaySeconds={chatDelaySeconds}
        setChatDelaySeconds={setChatDelaySeconds}
        subscribersOnly={subscribersOnly}
        setSubscribersOnly={setSubscribersOnly}
        linksAllowed={linksAllowed}
        setLinksAllowed={setLinksAllowed}
        
        viewerCount={streamStats.viewerCount}
        peakViewers={streamStats.peakViewers}
        duration={streamStats.duration}
        totalMessages={streamStats.totalMessages}
        
        onSave={handleSave}
        isSaving={isSaving}
      />
    </>
  );
};
```

## 🔧 Serviço de Viewers Adicionados

### addedViewersService

**Métodos:**
- `getAddedViewers(streamId)`: Obter contagem de viewers adicionados
- `setAddedViewers(streamId, count)`: Definir número de viewers adicionados
- `removeAddedViewers(streamId)`: Remover todos os viewers adicionados
- `getTotalViewerCount(streamId, realViewers)`: Obter contagem total

**Exemplo:**
```typescript
// Obter viewers adicionados
const addedCount = await addedViewersService.getAddedViewers(streamId);

// Adicionar 50 viewers
await addedViewersService.setAddedViewers(streamId, 50);

// Obter total
const { total, added, real } = await addedViewersService.getTotalViewerCount(
  streamId, 
  realViewerCount
);

console.log(`Real: ${real}, Boost: ${added}, Total: ${total}`);
```

## 🎨 Classes CSS Customizadas

### .minimal-scrollbar
Scrollbar ultra sutil (3px) que aparece apenas no hover.

**Uso:**
```tsx
<div className="overflow-y-auto minimal-scrollbar">
  {/* Conteúdo com scroll */}
</div>
```

## 📊 Estrutura do Banco de Dados

### Tabela: stream_added_viewers
```sql
CREATE TABLE stream_added_viewers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL,
  added_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(stream_id)
);
```

## 🚀 Features Implementadas

✅ Chat ultra minimalista com gradientes  
✅ Scrollbar customizada (3px, opacidade 4%)  
✅ Painel de controle de viewers adicionados  
✅ Sistema de boost transparente (streamer vê, viewers não)  
✅ Botão de encerrar com modal de confirmação  
✅ **Painel de configurações 100% estilo Admin**  
✅ **Ícones discretos e minimalistas**  
✅ **Sem cores vibrantes (exceto vermelho em bloqueios)**  
✅ **Labels uppercase tracking-widest**  
✅ **Inputs com rounded-2xl e opacidades 2-4%**  
✅ **Switch neutro em branco**  
✅ **Cards de estatísticas com hover**  
✅ **Gradientes 0.5px para divisores**  
✅ Design 100% responsivo  
✅ Tipografia extralight para elegância  

## 💡 Diferenças do Padrão Admin

### StreamSettingsPanel vs Admin Page

**Semelhanças:**
- Ícones discretos com stroke 1.5px
- Labels uppercase tracking-widest
- Inputs rounded-2xl com opacidades baixas
- Cards com bg-white/[0.02] e hover
- Divisores em gradiente 0.5px
- Botões com active:scale-95
- Font-extralight para textos secundários

**Ajustes para Streaming:**
- Layout em 2 colunas (Admin tem grid variável)
- Fixed overlay ao invés de página
- Scrollbar customizada para overflow
- Switch em branco (Admin usa cores específicas)
- Estatísticas simplificadas (4 cards)

## 🎯 Checklist de Implementação

Ao integrar no `StreamerDashboard.tsx`:

1. ✅ Importar `StreamSettingsPanel`
2. ✅ Remover modal antigo de configurações
3. ✅ Passar todas as props necessárias
4. ✅ Conectar `onSave` com lógica de update
5. ✅ Adicionar `isSaving` state
6. ✅ Testar responsividade mobile
7. ✅ Verificar acessibilidade (tab navigation)
8. ✅ Validar salvamento no Supabase

## 🔄 Migração do Código Antigo

### Antes (StreamerDashboard.tsx):
```tsx
{showStreamSettings && (
  <div className="fixed inset-0 bg-black z-50">
    <Card className="bg-zinc-900/50">
      {/* Código antigo com cores vibrantes */}
    </Card>
  </div>
)}
```

### Depois (StreamerDashboard.tsx):
```tsx
<StreamSettingsPanel
  isOpen={showStreamSettings}
  onClose={() => setShowStreamSettings(false)}
  {...allProps}
/>
```

Muito mais limpo e desacoplado! 🎉

