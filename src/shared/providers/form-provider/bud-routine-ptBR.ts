export const budRoutinePtBrForm = [
  {
    id: 'e5a29574-8ec4-4a69-9428-c5207539268f',
    type: 'reading_text',
    heading: 'Boas-vindas à sua Retrospectiva da Semana!',
    content:
      'Participar dessa rotina no Bud é uma excelente maneira de manter um bom alinhamento sobre as prioridades e o bem-estar de cada membro do time.\nEsse questionário leva cerca de 2 minutos:\n\n**Lembre-se:**\nSuas respostas ficarão visíveis para todos na empresa.',
  },
  {
    id: '44bd7498-e528-4f96-b45e-3a2374790373',
    type: 'emoji_scale',
    heading: 'Como você se sentiu essa semana?',
    content: '',
  },
  {
    id: 'd81e7754-79be-4638-89f3-a74875772d00',
    type: 'long_text',
    heading: 'Qual o principal motivo da sua resposta?',
    content: '',
  },
  {
    id: '9a56911a-61c1-49af-87a8-7a35a1804f6b',
    type: 'value_range',
    heading: 'O quão produtiva você sente que foi a sua semana?',
    content: '',
    properties: {
      steps: 5,
      labels: {
        left: 'Pouco',
        center: '',
        right: 'Muito',
      },
    },
  },
  {
    id: 'f0c6e297-7eb7-4b48-869c-aec96240ba2b',
    type: 'long_text',
    heading: 'O que atrapalhou sua produtividade?',
    content: '',
    conditional: {
      dependsOn: '9a56911a-61c1-49af-87a8-7a35a1804f6b',
      type: 'value_range',
      value_range: 3,
    },
  },
  {
    id: '95b84e67-d5b6-4fcf-938a-b4c9897596cb',
    type: 'long_text',
    heading: 'Quais são as coisas mais importantes que você fez essa semana?',
    content: '',
  },
  {
    id: 'a1d5b993-9430-40bb-8f0f-47cda69720b9',
    type: 'long_text',
    heading: 'E para a próxima semana, quais serão suas prioridades?',
    content: '',
  },
  {
    id: 'cf785f20-5a0b-4c4c-b882-9e3949589df2',
    type: 'road_block',
    heading: 'Alguma coisa bloqueia ou preocupa você?',
    content: '',
  },
  {
    id: 'd9ca02f3-7bf7-40f3-b393-618de3410751',
    type: 'long_text',
    heading: 'O que te bloqueia ou te preocupa?',
    content: '',
    conditional: {
      dependsOn: 'cf785f20-5a0b-4c4c-b882-9e3949589df2',
      type: 'road_block',
      road_block: true,
    },
  },
  {
    id: 'fd7c26dd-38e3-41e7-b24a-78030653dc23',
    type: 'long_text',
    heading: 'Quer deixar algum recado para o time? :)',
    content: '',
  },
];
