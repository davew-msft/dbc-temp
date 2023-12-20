import json
import os
from typing import List
from db_copilot.in_context_learning.faiss import FaissInContextLearningAgent, OpenaiEmbeddings
from db_copilot.contract.chat_core import InContextExample


current_file_path = os.path.abspath(__file__)
current_directory = os.path.dirname(current_file_path)

with open(os.path.join(current_directory, 'configs/secrets.json'), encoding='utf-8') as f:
    SECRETS: dict = json.load(f)

aoai_api_base = SECRETS['AOAI-API-BASE']
aoai_key = SECRETS['AOAI-KEY']
turbo_deployment = SECRETS['TURBO_DEPLOYMENT']
embedding_deployment = SECRETS['EMBEDDING_DEPLOYMENT']


examples : List[InContextExample] = []

examples.append(
    InContextExample(
        embed_text='top 3 brands by total sales',
        prompt_text="""
<Question>
top 3 brands by total sales
</Question>
<Response>
<Cell>
```tsql
SELECT TOP(3) [brand], SUM([sales])
FROM [CarSales]
GROUP BY [brand]
ORDER BY SUM([sales]) DESC
```
</Cell>
</Response>
            """.strip()
    )
)

examples.append(
    InContextExample(
        embed_text='how many people are there in Asia?',
        prompt_text="""
<Question>
how many people are there in Asia?
</Question>
<Response>
<Cell>
```tsql
SELECT COUNT([population])
FROM [Countries]
WHERE [consistent] == 'ASIA'
```
</Cell>
</Response>
            """.strip()
    )
)

if __name__ == '__main__':
    icl_agent = FaissInContextLearningAgent(
        examples=examples,
        embeddings=OpenaiEmbeddings(
            endpoint_url=f'{aoai_api_base}openai/deployments/{embedding_deployment}/embeddings?api-version=2023-03-15-preview',
            api_key=aoai_key,
            model= embedding_deployment
        )
    )

    question = 'usa population'

    top_k_examples = icl_agent.similarity_search(
        query=InContextExample(question, None),
        top_k=4
    )

    print(f'Question: {question}')
    print('-----------------------------------')
    for i, example in enumerate(top_k_examples):
        print(f'Example {i+1}:\n{example.prompt_text}\n-----------------------------------\n')
