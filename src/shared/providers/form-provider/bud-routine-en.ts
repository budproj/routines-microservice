export const budRoutineEnForm = [
  {
    id: 'e5a29574-8ec4-4a69-9428-c5207539268f',
    type: 'reading_text',
    heading: 'Welcome to your Weekly Review!',
    content:
      'Participating in this routine on Bud is an excellent way to maintain good alignment on the priorities and well-being of each team member.\nThis questionnaire takes about 2 minutes:\n\n**Remember:**\nYour answers will be visible to everyone in the company.',
  },
  {
    id: '44bd7498-e528-4f96-b45e-3a2374790373',
    type: 'emoji_scale',
    heading: 'How did you feel this week?',
    content: '',
  },
  {
    id: 'd81e7754-79be-4638-89f3-a74875772d00',
    type: 'long_text',
    heading: 'What is the main reason for your answer?',
    content: '',
  },
  {
    id: '9a56911a-61c1-49af-87a8-7a35a1804f6b',
    type: 'value_range',
    heading: 'How productive do you feel your week was?',
    content: '',
    properties: {
      steps: 5,
      labels: {
        left: 'Little',
        center: '',
        right: 'Very',
      },
    },
  },
  {
    id: 'f0c6e297-7eb7-4b48-869c-aec96240ba2b',
    type: 'long_text',
    heading: 'What got in the way of your productivity?',
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
    heading: 'What are the most important things you did this week?',
    content: '',
  },
  {
    id: 'a1d5b993-9430-40bb-8f0f-47cda69720b9',
    type: 'long_text',
    heading: 'For the next week, what will be your priorities?',
    content: '',
  },
  {
    id: 'cf785f20-5a0b-4c4c-b882-9e3949589df2',
    type: 'road_block',
    heading: 'Does anything block or worry you?',
    content: '',
  },
  {
    id: 'd9ca02f3-7bf7-40f3-b393-618de3410751',
    type: 'long_text',
    heading: 'What blocks you or worries you?',
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
    heading: 'Want to leave a message for the team? :)',
    content: '',
  },
];
