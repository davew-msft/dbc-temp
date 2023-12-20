# Example Selector: What Makes Good In-Context Examples for OpenAI Language Models?

## Introduction

### What Are In-Context Examples?

To better prompt OpenAI language models to complete a specific task, it is important to provide a few examles.

For example, to classify the sentiment of Tweets, we can use this prompt:

```
This is a tweet sentiment classifier

Tweet: "I loved the new Batman movie!"
Sentiment: Positive

Tweet: "I hate it when my phone battery dies." 
Sentiment: Negative

Tweet: "My day has been 👍"
Sentiment: Positive

Tweet: "This is the link to the article"
Sentiment: Neutral

Tweet: "This new music video blew my mind"
Sentiment:
```

This prompt contains four **in-context examples**.

### How to Select Better In-Context Examples?

Different user questions require different in-context examples.
For example, in the NL-to-SQL scenario, consider the user question `usa population` and two candidate examples: `how many people are there in Asia?` and `top 3 brands by total sales`.
For this specific user question, we think `how many people are there in Asia?` is a better in-context example than `top 3 brands by total sales`, from the perspective of semantic similarity.

Therefore, it is important that **we need a good example selector that can find good in-context examples (from an example bank) for each user question dynamically.**

### Algorithms

#### Nearest Neighbors (based on Embeddings)

- Paper: [What Makes Good In-Context Examples for GPT-3?](https://arxiv.org/pdf/2101.06804.pdf)
- Basic idea: Retrieve examples that are semantically similar to the user question.
- This is the default algorithm in DBCopilotLib.

#### Advanced Algorithms

We are working on implementing our advanced example selection algorithms into DBCopilotLib.

## Run the Sample Code

### Prerequisites

#### Install DBCopilotLib

Follow [the instructions](https://dev.azure.com/TScience/NL2Code/_git/DBCopilotLib-Samples?anchor=install-dbcopilotlib) to install DBCopilotLib.

#### Azure OpenAI Secrets Configuration

1. Copy and paste `configs/secrets.json.template` as `configs/secrets_config.json`.
2. Replace the placeholders in this config file as the corresponding values in your own Azure OpenAI Service resource.
    - Note that, the embedding deployment should be based on the `text-embedding-ada-002` model.

### Run the Sample Code

```python
python example.py
```

The output looks like:

~~~
Question: usa population
-----------------------------------
Example 1:
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
-----------------------------------

Example 2:
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
-----------------------------------
~~~

In `example.py`, we create the example bank `examples : List[InContextExample]` and add two examples to this list.
You are allowed to add more examples to this example bank.
We use `icl_agent = FaissInContextLearningAgent(...)` to build the example selector, then use `icl_agent.similarity_search(...)` to find top-k examples from the example bank for the given user question.

In this sample code, though we set `top_k=4`, the example bank only contains two examples, thus `icl_agent.similarity_search(...)` only returns two examples.
If `len(examples) >= 4`, the result will contain four examples.

In the sample code output, we can find that `how many people are there in Asia?` is ranked before `top 3 brands by total sales`.
The reason is: the user question `usa population` has a high semantic similarity score to `how many people are there in Asia?`, so the example selector regards that `how many people are there in Asia?` is a better in-context example than `top 3 brands by total sales`.

### How to Use In-Context Examples

Prepend the string `'\n\n'.join([for example in reversed(top_k_examples)])` to your prompt.