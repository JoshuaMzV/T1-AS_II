import React from 'react';

// Estilos en línea para simplicidad, pero podrían ir en tu CSS
const styles = {
  chord: {
    fontWeight: 'bold',
    color: '#007bff', // Un color azul para los acordes
  },
  comment: {
    fontStyle: 'italic',
    color: '#6c757d', // Un color gris para los comentarios
  }
};

const ChartRenderer = ({ text }) => {
  // Expresión regular que captura acordes [Acorde] o comentarios (Comentario)
  const regex = /(\[.*?\])|(\(.*?\))/g;

  // Si el texto está vacío o no es un string, no renderiza nada.
  if (!text || typeof text !== 'string') {
    return null;
  }
  
  // Divide el texto en partes: acordes, comentarios y texto normal.
  const parts = text.split(regex).filter(part => part);

  return (
    <pre className="chart-body">
      {parts.map((part, index) => {
        if (part.startsWith('[') && part.endsWith(']')) {
          return <span key={index} style={styles.chord}>{part}</span>;
        }
        if (part.startsWith('(') && part.endsWith(')')) {
          return <span key={index} style={styles.comment}>{part}</span>;
        }
        return part; // Esto es el texto normal (letra de la canción)
      })}
    </pre>
  );
};

export default ChartRenderer;