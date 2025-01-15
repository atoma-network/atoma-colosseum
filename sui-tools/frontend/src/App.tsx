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

// Add new response type
interface QueryResponse {
  status: 'success' | 'error' | 'needs_info';
  error?: string;
  final_answer?: string;
  reasoning?: string;
  results?: any[];
  request?: string;
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

  const sampleQueries = [
    {
      text: "Pool Overview",
      query: "Get information about pool 0x52ac89ee8c446638930f53129803f026a04028d2c0deef314321f71c69ab7f78",
      category: "Overview"
    },
    {
      text: "Pool APR",
      query: "What's the APR of pool 0x52ac89ee8c446638930f53129803f026a04028d2c0deef314321f71c69ab7f78?",
      category: "Returns"
    },
    {
      text: "Daily Fees",
      query: "Show me the daily fees for pool 0x52ac89ee8c446638930f53129803f026a04028d2c0deef314321f71c69ab7f78",
      category: "Metrics"
    },
    {
      text: "Spot Price",
      query: "What's the spot price between afSUI and ksui in pool 0x52ac89ee8c446638930f53129803f026a04028d2c0deef314321f71c69ab7f78?",
      category: "Price"
    },
    {
      text: "SUI Price",
      query: "What's the current price of SUI?",
      category: "Price"
    },
    {
      text: "Multi Prices",
      query: "Show me the prices of SUI, USDC, and BTC",
      category: "Price"
    }
  ];

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
      if (responseCache[query] && retryCount === 0) {
        setResponse(responseCache[query]);
        setLoading(false);
        return;
      }

      const result = await axios.post<QueryResponse>('http://localhost:3001/api/query', { query });
      
      // Handle different response types
      if (result.data.status === 'needs_info') {
        toast({
          title: '🤔 Need More Information',
          description: result.data.request || 'Could you provide more details?',
          status: 'info',
          duration: 5000,
          isClosable: true,
        });
        return;
      }

      if (result.data.status === 'error') {
        throw new Error(result.data.error || 'Failed to get data');
      }

      setResponseCache(prev => ({...prev, [query]: result.data}));
      setResponse(result.data);
      setRetryCount(0);

    } catch (error) {
      toast({
        title: '❌ Error',
        description: error instanceof Error ? error.message : 'Failed to get data. Please try again.',
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [query, retryCount, responseCache, toast]);

  // Response display component
  const ResponseDisplay = ({ response }: { response: QueryResponse }) => {
    if (!response) return null;

    return (
      <Box p={6} borderRadius="xl" bg={bgColor} boxShadow="sm" borderWidth={1} borderColor={borderColor}>
        <Box mb={6}>
          <Text fontWeight="bold" color="gray.700" mb={3} fontSize="lg">
            {response.status === 'needs_info' ? '🤔 I Need More Information:' : 'Here\'s what I found:'}
          </Text>
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
            {response.status === 'error' 
              ? response.error 
              : response.status === 'needs_info'
              ? response.request
              : response.final_answer || "No data available"}
          </Code>
        </Box>

        {response.reasoning && response.status !== 'error' && (
          <>
            <Divider my={4} />
            <Box>
              <Text fontWeight="bold" color="gray.700" mb={2} fontSize="md">
                💭 My Thought Process:
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
      </Box>
    );
  };

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