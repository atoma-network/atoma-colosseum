import React, { useState, useCallback } from 'react';
import {
  ChakraProvider,
  Box,
  VStack,
  Input,
  Button,
  Text,
  Heading,
  useToast,
  Container,
  Spinner,
  Code,
  Divider,
  Icon,
  HStack,
  Badge,
  useColorModeValue,
  Tooltip,
} from '@chakra-ui/react';
import { FaSearch, FaInfoCircle } from 'react-icons/fa';
import axios from 'axios';

// Update interfaces to match new agent response format
interface QueryResponse {
  status: 'success' | 'error' | 'needs_info';
  reasoning: string;
  error_message?: string;
  request?: string;
  final_answer?: string;
  results?: any[];
  actions?: {
    tool: string;
    input: Record<string, any>;
    expected_outcome: string;
  }[];
}

function App() {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<QueryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const toast = useToast();

  // Cache for responses
  const [responseCache, setResponseCache] = useState<{[key: string]: any}>({});

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Update sample queries to better demonstrate agent capabilities
  const sampleQueries = [
    {
      text: "Pool Overview",
      query: "Get information about pool 0x52ac89ee8c446638930f53129803f026a04028d2c0deef314321f71c69ab7f78",
      category: "Analysis"
    },
    {
      text: "Top 10 Pools",
      query: "What are the top 10 pools by tvl?",
      category: "Rankings"
    },
    {
      text: "Spot Price",
      query: "What's the spot price between afSUI and ksui in pool 0x52ac89ee8c446638930f53129803f026a04028d2c0deef314321f71c69ab7f78?",
      category: "Price"
    },
    {
      text: "Token Prices",
      query: "Show me the prices of SUI, USDC, and BTC",
      category: "Market"
    }
  ];

  // Enhanced response display component
  const ResponseDisplay = ({ response }: { response: QueryResponse }) => {
    if (!response) return null;

    // Helper function to format pool information
    const formatPoolResponse = (content: string) => {
      // Split into sections if it's pool information
      if (content.includes("Pool Information")) {
        const [summary, details] = content.split("\n\n");
        return (
          <VStack align="stretch" spacing={4}>
            {/* Summary Section */}
            <Box>
              <Text 
                color="gray.700" 
                fontSize="md" 
                whiteSpace="pre-wrap"
                p={4}
                bg="blue.50"
                borderRadius="lg"
              >
                {summary}
              </Text>
            </Box>

            {/* Detailed Information */}
            <Box>
              <Code
                display="block"
                whiteSpace="pre-wrap"
                p={4}
                borderRadius="lg"
                bg="gray.50"
                fontSize="sm"
                overflowX="auto"
              >
                {details}
              </Code>
            </Box>
          </VStack>
        );
      }

      // Default formatting for non-pool responses
      return (
        <Code
          display="block"
          whiteSpace="pre-wrap"
          p={4}
          borderRadius="lg"
          bg={response.status === 'error' ? 'red.50' : 'gray.50'}
          color={response.status === 'error' ? 'red.600' : 'inherit'}
          fontSize="sm"
          overflowX="auto"
        >
          {content}
        </Code>
      );
    };

    return (
      <Box p={6} borderRadius="xl" bg={bgColor} boxShadow="sm" borderWidth={1} borderColor={borderColor}>
        {/* Status Badge */}
        <HStack mb={4}>
          <Badge
            colorScheme={
              response.status === 'success' ? 'green' :
              response.status === 'needs_info' ? 'yellow' : 'red'
            }
            fontSize="sm"
            px={2}
            py={1}
            borderRadius="md"
          >
            {response.status.toUpperCase()}
          </Badge>
        </HStack>

        {/* Main Response Content */}
        <Box mb={6}>
          <Text fontWeight="bold" color="gray.700" mb={3} fontSize="lg">
            {response.status === 'needs_info' ? '🤔 Additional Information Needed:' :
             response.status === 'error' ? '❌ Error:' : '💡 Analysis Results:'}
          </Text>
          {response.status === 'error' ? (
            <Text color="red.600" p={4} bg="red.50" borderRadius="lg">
              {response.error_message}
            </Text>
          ) : response.status === 'needs_info' ? (
            <Text color="orange.600" p={4} bg="orange.50" borderRadius="lg">
              {response.request}
            </Text>
          ) : (
            formatPoolResponse(response.final_answer || "No data available")
          )}
        </Box>

        {/* Reasoning Section */}
        {response.reasoning && response.status !== 'error' && (
          <>
            <Divider my={4} />
            <Box>
              <Text fontWeight="bold" color="gray.700" mb={2} fontSize="md">
                🧠 Reasoning Process:
              </Text>
              <Text 
                color="gray.600" 
                fontSize="sm" 
                lineHeight="1.6"
                p={4}
                bg="blue.50"
                borderRadius="lg"
              >
                {response.reasoning}
              </Text>
            </Box>
          </>
        )}

        {/* Actions Section */}
        {response.actions && response.actions.length > 0 && (
          <>
            <Divider my={4} />
            <Box>
              <Text fontWeight="bold" color="gray.700" mb={2} fontSize="md">
                🔧 Actions Performed:
              </Text>
              <VStack align="stretch" spacing={2}>
                {response.actions.map((action, index) => (
                  <Box 
                    key={index}
                    p={3}
                    bg="gray.50"
                    borderRadius="md"
                    fontSize="sm"
                  >
                    <Text fontWeight="bold">Tool: {action.tool}</Text>
                    <Text color="gray.600">
                      Expected Outcome: {action.expected_outcome}
                    </Text>
                  </Box>
                ))}
              </VStack>
            </Box>
          </>
        )}
      </Box>
    );
  };

  // Enhanced error handling in submit function
  const handleSubmit = useCallback(async () => {
    if (!query.trim()) {
      toast({
        title: '🤔 Need a Question',
        description: 'Please ask me something about Sui pools or tokens',
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setLoading(true);
    try {
      const result = await axios.post<QueryResponse>('http://localhost:3001/api/query', { query });
      
      if (result.data.status === 'needs_info') {
        toast({
          title: '🤔 Need More Information',
          description: result.data.request,
          status: 'warning',
          duration: 5000,
          isClosable: true,
          position: 'top',
        });
      } else if (result.data.status === 'error') {
        toast({
          title: '❌ Error',
          description: result.data.error_message || 'An error occurred',
          status: 'error',
          duration: 4000,
          isClosable: true,
          position: 'top',
        });
      }

      setResponse(result.data);
    } catch (error) {
      console.error('API Error:', error);
      toast({
        title: '❌ Error',
        description: error instanceof Error ? error.message : 'Failed to get data. Please try again.',
        status: 'error',
        duration: 4000,
        isClosable: true,
        position: 'top',
      });
    } finally {
      setLoading(false);
    }
  }, [query, toast]);

  return (
    <ChakraProvider>
      <Container maxW="container.lg" py={8}>
        <VStack spacing={8} align="stretch">
          {/* Header Section */}
          <Box textAlign="center" mb={6}>
            <Heading as="h1" size="xl" mb={2}>
              👋 Hi, I'm SuiSage
            </Heading>
            <Text color="gray.600" fontSize="lg">
              Your friendly guide to Sui blockchain metrics
            </Text>
          </Box>

          {/* Search Section */}
          <Box
            p={6}
            borderRadius="xl"
            bg={bgColor}
            boxShadow="sm"
            borderWidth={1}
            borderColor={borderColor}
          >
            <HStack>
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask me about any Sui pool or token..."
                size="lg"
                bg={bgColor}
                borderRadius="lg"
                _focus={{
                  boxShadow: 'outline',
                  borderColor: 'blue.400',
                }}
                onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
              />
              <Button
                colorScheme="blue"
                size="lg"
                onClick={handleSubmit}
                isLoading={loading}
                loadingText="Thinking..."
                leftIcon={<Icon as={FaSearch} />}
              >
                Ask
              </Button>
            </HStack>

            {/* Sample Queries */}
            <Box mt={4}>
              <Text fontSize="sm" color="gray.600" mb={2}>
                Try asking about:
              </Text>
              <HStack spacing={2} flexWrap="wrap">
                {sampleQueries.map((q, i) => (
                  <Tooltip key={i} label={q.query} placement="top">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setQuery(q.query)}
                      leftIcon={<Icon as={FaInfoCircle} />}
                      mb={2}
                    >
                      <Text>{q.text}</Text>
                      <Badge ml={2} colorScheme="blue" variant="subtle">
                        {q.category}
                      </Badge>
                    </Button>
                  </Tooltip>
                ))}
              </HStack>
            </Box>
          </Box>

          {/* Loading State */}
          {loading && (
            <Box
              textAlign="center"
              p={8}
              borderRadius="xl"
              bg={bgColor}
              boxShadow="sm"
            >
              <Spinner size="xl" color="blue.500" thickness="3px" />
              <Text mt={4} color="gray.600" fontSize="lg">
                Analyzing blockchain data...
              </Text>
            </Box>
          )}

          {/* Response Section */}
          {response && !loading && (
            <ResponseDisplay response={response} />
          )}
        </VStack>
      </Container>
    </ChakraProvider>
  );
}

export default App; 