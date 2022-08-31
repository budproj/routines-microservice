export const budRoutineEnForm = [
  {
    id: 'f7d12361-9350-48e7-9e99-0d940ba7bea3',
    type: 'reading_text',
    heading: 'Welcome to your Weekly Review!',
    content:
      'Participating in this routine on Bud is an excellent way to maintain good alignment on the priorities and well-being of each team member.\nThis questionnaire takes about 2 minutes:\n\n**Remember:** nYour answers will be visible to everyone in the company.',
  },
  {
    id: 'a30d79b0-81f9-4fe7-9a40-6a807aa46359',
    type: 'emoji_scale',
    heading: 'How did you feel this week?',
    content: '',
  },
  {
    id: 'c7ab7273-ee7b-47fb-97b3-79eab16c7138',
    type: 'long_text',
    heading: 'What is the main reason for your answer?',
    content: '',
  },
  {
    id: 'd968550c-ee16-4df2-9d29-729842573caf',
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
    id: 'c97dcf60-2254-49b2-808b-a737b3142b40',
    type: 'long_text',
    heading: 'What got in the way of your productivity?',
    content: '',
    conditional: {
      dependsOn: 'd968550c-ee16-4df2-9d29-729842573caf',
      type: 'value_range',
      value_range: 3,
    },
  },
  {
    id: 'f1c4abf4-4539-4c91-8cfe-e4018b14e9e4',
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
    id: '30630595-249f-4fb0-b73f-792981f65656',
    type: 'road_block',
    heading: 'Does anything block or worry you?',
    content: '',
  },
  {
    id: '20bea9de-1ca2-46df-ac3c-3f2b61c84a79',
    type: 'long_text',
    heading: 'O que te bloqueia ou te preocupa?',
    content: '',
    conditional: {
      dependsOn: '30630595-249f-4fb0-b73f-792981f65656',
      type: 'road_block',
      road_block: true,
    },
  },
  {
    id: '84d4c735-aed6-4499-8fb0-c219b7ee714e',
    type: 'long_text',
    heading: 'Want to leave a message for the team? :)',
    content: '',
  },
];
