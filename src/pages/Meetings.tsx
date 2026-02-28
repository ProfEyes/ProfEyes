import React from 'react';
import Layout from '@/components/Layout';
import MeetingComponent from '@/components/MeetingComponent';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Video, Users, Calendar, Check, AlertCircle } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const Meetings = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Redirecionar para login se não estiver autenticado
  React.useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);
  
  if (!user) {
    return null; // Não renderizar nada até redirecionar
  }
  
  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">{t('meetings.title')}</h1>
        </div>
        
        <Alert className="bg-blue-500/10 border-blue-500/20 text-blue-500">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('meetings.demo.title')}</AlertTitle>
          <AlertDescription>{t('meetings.demo.description')}</AlertDescription>
        </Alert>
        
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full md:w-[400px] grid-cols-2">
            <TabsTrigger value="active" className="flex items-center">
              <Video className="mr-2 h-4 w-4" />
              {t('meetings.active_meetings')}
            </TabsTrigger>
            <TabsTrigger value="demo" className="flex items-center">
              <AlertCircle className="mr-2 h-4 w-4" />
              {t('meetings.demo.title')}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="active" className="space-y-6">
            <MeetingComponent />
          </TabsContent>
          
          <TabsContent value="demo" className="space-y-6">
            <p className="mb-4 text-muted-foreground">{t('meetings.demo.create_hint')}</p>
            
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t('meetings.demo.features_title')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                      <span>{t('meetings.demo.feature_1')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                      <span>{t('meetings.demo.feature_2')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                      <span>{t('meetings.demo.feature_3')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                      <span>{t('meetings.demo.feature_4')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                      <span>{t('meetings.demo.feature_5')}</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>{t('meetings.demo.coming_soon')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="h-5 w-5 flex items-center justify-center rounded-full border border-muted text-xs">1</span>
                      <span>{t('meetings.demo.soon_1')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="h-5 w-5 flex items-center justify-center rounded-full border border-muted text-xs">2</span>
                      <span>{t('meetings.demo.soon_2')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="h-5 w-5 flex items-center justify-center rounded-full border border-muted text-xs">3</span>
                      <span>{t('meetings.demo.soon_3')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="h-5 w-5 flex items-center justify-center rounded-full border border-muted text-xs">4</span>
                      <span>{t('meetings.demo.soon_4')}</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
        
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{t('meetings.about.title')}</CardTitle>
            <CardDescription>{t('meetings.about.intro')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <h3 className="text-lg font-semibold">{t('meetings.about.how_works')}</h3>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>{t('meetings.about.features.permission')}</li>
              <li>{t('meetings.about.features.google_meet')}</li>
              <li>{t('meetings.about.features.join')}</li>
              <li>{t('meetings.about.features.share')}</li>
            </ul>
            
            <h3 className="text-lg font-semibold">{t('meetings.about.benefits')}</h3>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>{t('meetings.about.features.screen_sharing')}</li>
              <li>{t('meetings.about.features.chat')}</li>
              <li>{t('meetings.about.features.quality')}</li>
              <li>{t('meetings.about.features.stability')}</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Meetings; 