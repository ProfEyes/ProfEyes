import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { Video, Share2, Copy, Users, ExternalLink, X } from 'lucide-react';
import { useLiveStreamPermission } from './LiveStreamPermissionProvider';
import { Meeting, getActiveMeetings, createMeeting, endMeeting, updateParticipantsCount, subscribeToMeetingsChanges } from '@/services/meetingService';
import { toast } from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';

interface MeetingComponentProps {
  onMeetingCreated?: (meeting: Meeting) => void;
}

export const MeetingComponent: React.FC<MeetingComponentProps> = ({ onMeetingCreated }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [activeMeetings, setActiveMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const { canStartLive } = useLiveStreamPermission();
  const { t } = useLanguage();
  
  // Buscar reuniões ativas
  const fetchActiveMeetings = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const meetings = await getActiveMeetings();
      setActiveMeetings(meetings);
    } catch (error: unknown) {
      console.error('Erro ao buscar reuniões:', error);
      addNotification({
        type: 'error',
        title: 'Erro ao buscar reuniões',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date()
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchActiveMeetings();
    
    // Configurar um listener para atualizações de reuniões
    const unsubscribe = subscribeToMeetingsChanges((meetings) => {
      setActiveMeetings(meetings);
      setIsLoading(false);
    });
    
    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // fetchActiveMeetings não pode ser incluída para evitar loop infinito
  
  // Criar uma nova reunião do Google Meet
  const handleCreateMeeting = async () => {
    if (!user) return;
    if (!canStartLive) {
      addNotification({
        type: 'error',
        title: t('meetings.error.permission_denied'),
        message: t('meetings.error.permission_denied'),
        timestamp: new Date()
      });
      return;
    }
    
    if (!title.trim()) {
      addNotification({
        type: 'error',
        title: t('meetings.error.create_failed'),
        message: t('meetings.error.title_required'),
        timestamp: new Date()
      });
      return;
    }
    
    setIsCreating(true);
    
    try {
      // Criar URL do Google Meet (usando link direto)
      // Em produção, você pode utilizar a API do Google Calendar para criar reuniões oficiais
      const googleMeetUrl = `https://meet.google.com/new?hs=187&authuser=0`;
      
      // Criar a reunião no banco de dados usando o serviço
      const createdMeeting = await createMeeting(user.id, {
        title: title,
        description: description,
        meetingUrl: googleMeetUrl
      });
      
      setMeetingUrl(googleMeetUrl);
      addNotification({
        type: 'success',
        title: t('meetings.create_meeting'),
        message: t('meetings.create_meeting'),
        timestamp: new Date()
      });
      
      // Limpar o formulário
      setTitle('');
      setDescription('');
      
      // Notificar o componente pai se necessário
      if (onMeetingCreated) {
        onMeetingCreated(createdMeeting);
      }
      
      // Abrir a reunião em uma nova aba
      window.open(googleMeetUrl, '_blank');
      
    } catch (error: unknown) {
      console.error('Erro ao criar reunião:', error);
      addNotification({
        type: 'error',
        title: t('meetings.error.create_failed'),
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date()
      });
    } finally {
      setIsCreating(false);
    }
  };
  
  // Finalizar uma reunião
  const handleEndMeeting = async (meetingId: string) => {
    if (!user) return;
    
    try {
      await endMeeting(meetingId, user.id);
      
      toast.success(t('meetings.end_meeting'));
      
      // Atualizar a lista de reuniões
      fetchActiveMeetings();
    } catch (error: unknown) {
      console.error('Erro ao finalizar reunião:', error);
      toast.error((error instanceof Error ? error.message : null) || t('meetings.error.end_failed'));
    }
  };
  
  // Entrar em uma reunião
  const handleJoinMeeting = async (meeting: Meeting) => {
    try {
      // Incrementar o contador de participantes
      await updateParticipantsCount(meeting.id, true);
      
      // Abrir a reunião em uma nova aba
      window.open(meeting.meetingUrl, '_blank');
    } catch (error) {
      console.error('Erro ao entrar na reunião:', error);
    }
  };
  
  // Copiar o link da reunião para a área de transferência
  const copyMeetingLink = (url: string) => {
    navigator.clipboard.writeText(url);
    addNotification({
      type: 'success',
      title: t('meetings.copy_link'),
      message: t('meetings.link_copied'),
      timestamp: new Date()
    });
  };
  
  return (
    <div className="space-y-6">
      {canStartLive && (
        <Card>
          <CardHeader>
            <CardTitle>{t('meetings.create_meeting')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium mb-1">
                {t('meetings.meeting_title')}
              </label>
              <Input 
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('meetings.title_placeholder')}
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-1">
                {t('meetings.meeting_description')}
              </label>
              <Input 
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('meetings.description_placeholder')}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleCreateMeeting} 
              disabled={isCreating || !title.trim()}
              className="w-full"
            >
              <Video className="mr-2 h-4 w-4" />
              {isCreating ? t('meetings.creating_meeting') : t('meetings.start_meeting')}
            </Button>
          </CardFooter>
        </Card>
      )}
      
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">{t('meetings.active_meetings')}</h3>
        {isLoading ? (
          <p>Carregando reuniões...</p>
        ) : activeMeetings.length > 0 ? (
          <div className="space-y-4">
            {activeMeetings.map((meeting) => (
              <Card key={meeting.id} className="relative">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h4 className="font-semibold">{meeting.title}</h4>
                      {meeting.description && (
                        <p className="text-sm text-muted-foreground">{meeting.description}</p>
                      )}
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Users className="mr-1 h-3.5 w-3.5" />
                        <span>{meeting.participants} {t('meetings.participants')}</span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => copyMeetingLink(meeting.meetingUrl)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => handleJoinMeeting(meeting)}
                      >
                        <ExternalLink className="mr-2 h-3.5 w-3.5" />
                        {t('meetings.join')}
                      </Button>
                    </div>
                  </div>
                  
                  {meeting.createdBy === user?.id && (
                    <Button
                      size="sm"
                      variant="destructive"
                      className="absolute top-2 right-2 h-7 w-7 p-0"
                      onClick={() => handleEndMeeting(meeting.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">{t('meetings.no_active_meetings')}</p>
        )}
      </div>
    </div>
  );
};

export default MeetingComponent; 