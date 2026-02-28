import React from 'react';
import Layout from "@/components/Layout";
import SupportTopics from "@/components/settings/SupportTopics";
import { motion } from 'framer-motion';

const Support = () => {
  return (
    <Layout>
      <div className="relative w-full h-full flex flex-col bg-black overflow-hidden">
        {/* Conteúdo principal - Tópicos de suporte em tela cheia */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full h-full p-4"
        >
          <SupportTopics />
        </motion.div>
      </div>
    </Layout>
  );
};

export default Support;