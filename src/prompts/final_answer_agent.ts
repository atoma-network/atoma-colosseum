

export default `this is the User query:\${query} and this is what your raw  response \${response}. 
\${tools } tools were used.
This is raw and unrefined
Write down the response in this format 

[{
"reasoning": string, // explain your reasoning in clear terms
"response": string | JSON // clear terms detailed until explicitly stated otherwise. IF RESPONSE IS JSON, RETURN IT AS A JSON OBJECT
"status": string ("success"| "failure") ,// success if no errors
"query": string ,// initial user query; 
"errors": any[], //if any
}]

DO NOT UNDER ANY CIRCUMSTANCES STRAY FROM THE RESONSE FORMAT
RESPOND WITH ONLY THE RESONSE FORMAT
`