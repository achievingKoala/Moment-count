export function questionsForScene(scene){const isMarket=scene==='market',isCafe=scene==='cafe';return isMarket?['Do you enjoy shopping for food?','How often do you eat fruit and vegetables?','Do you prefer shopping at markets or supermarkets?','Do you like cooking at home?','What do you usually do at weekends?','Do you prefer spending time indoors or outdoors?']:isCafe?['Do you prefer tea or coffee?','What do you usually have for breakfast?','Do you often go to cafés with your friends?','What do you like to do when you meet your friends?','Do you prefer eating at home or eating out?','What do you usually do in the morning?']:['What do you like to do in your free time?'];
}

export const practiceHints={
'What do you like to do in your free time?':'Name an activity you enjoy → Say when or where you do it → Explain why you enjoy it. Example: I enjoy reading. I usually read at home before bed because it helps me relax.',
'Do you often go to parks?':'Say how often you go → Mention who you go with → Explain why you like going there. Example: I go to the park every Sunday with my family because we enjoy the fresh air.',
'What do you usually do when you visit a park?':'Name one or two activities → Add a detail about your usual visit → Describe how you feel. Example: I usually take a walk in the park. I often walk around the lake, and I feel relaxed afterwards.',
'Do you prefer going to parks alone or with friends?':'State your preference → Give a reason → Mention an activity you enjoy doing there. Example: I prefer going with friends because we can chat. We usually take a walk together.',
'Do you prefer tea or coffee?':'State your preference → Explain what you like about it → Say when you usually drink it. Example: I prefer tea because I like its light taste. I usually drink it after breakfast.',
'What do you usually have for breakfast?':'Name your usual food and drink → Explain why you choose them → Say whether weekends are different. Example: I usually have eggs and milk because they are easy to prepare. At weekends, I sometimes have noodles instead.',
'Do you often go to cafés with your friends?':'Say how often you go → Mention when you usually meet → Describe what you do together. Example: I go to cafés with my friends about once a month. We usually meet at weekends and chat over coffee.',
'Do you enjoy shopping for food?':'Say yes or no → Explain why → Give a detail from your usual shopping routine. Example: Yes, I enjoy shopping for food because I like choosing fresh fruit. I usually buy apples at the market on Sundays.',
'How often do you eat fruit and vegetables?':'Say how often → Give examples of what you eat → Mention which meals you have them with. Example: I eat fruit and vegetables every day. I usually have a banana with breakfast and carrots with lunch.',
'Do you prefer shopping at markets or supermarkets?':'Choose one → Explain your reason, such as price or convenience → Add a detail about your shopping habits. Example: I prefer supermarkets because they are convenient. I usually buy everything I need in one visit.'
};

export const parkQuestions=['Do you often go to parks?','What do you usually do when you visit a park?','Do you prefer going to parks alone or with friends?','Did you go to parks when you were a child?','Is there a park near your home?','Would you like to spend more time in parks?'];
