import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import Layout from '@/components/Layout';

const Home = () => {
  const { t } = useLanguage();

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-6">{t('nav.home')}</h1>
        <p className="text-xl mb-4">{t('dashboard.title')}</p>
        <p className="mb-4">{t('dashboard.market.opportunities')}</p>
      </div>
    </Layout>
  );
};

export default Home; 