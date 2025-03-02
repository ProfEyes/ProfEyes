import React from 'react';

const Achievements = () => {
  const achievements = [
    { id: 1, title: "Primeira Compra", description: "Realize sua primeira compra no app." },
    { id: 2, title: "Meta Atingida", description: "Atinga uma meta de investimento." },
  ];

  return (
    <div className="achievements">
      {achievements.map(ach => (
        <div key={ach.id} className="achievement">
          <h3>{ach.title}</h3>
          <p>{ach.description}</p>
        </div>
      ))}
    </div>
  );
};

export default Achievements; 