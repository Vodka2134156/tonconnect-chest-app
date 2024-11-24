import React, { useState ,useEffect , useRef} from 'react';
import { Image,
  Box, VStack, Text, Button, Flex, Input, IconButton, Divider, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, InputGroup, InputRightElement, HStack
} from '@chakra-ui/react';
import { FiSearch, FiChevronDown } from 'react-icons/fi';

import { FaLock } from 'react-icons/fa';  // Lock icon for Private mode
import { FaArrowsRotate } from 'react-icons/fa6';



function Exchange() {
  const [sendAmount, setSendAmount] = useState('');
  const [receiveAmount, setReceivedAmount] = useState('');
  const [fees, setFeeAmount] = useState('');
  
  const [fromToken, setFromToken] = useState('SOL');
  const [fromNet, setFromNet] = useState('SOL');
  const [errorMessage, setErrorMessage] = useState('');

  const [toToken, setToToken] = useState('TON');
  const [toNet, setToNet] = useState('TON');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectingToken, setSelectingToken] = useState(''); // 'from' or 'to'
  const [fromSearchQuery, setFromSearchQuery] = useState(''); // Search query for "from" token
  const [toSearchQuery, setToSearchQuery] = useState(''); // Search query for "to" token
  const [privacyMode, setPrivacyMode] = useState('standard');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [tokens, setTokens] = useState([]);
  const debounceTimer = useRef(null);
  const [loadingRate, setLoadingRate] = useState(false);
  const [userId, setUserId] = useState(null);
  // Privacy mode state: 'standard' or 'private'
 
  useEffect(() => {
    if (window.Telegram && window.Telegram.WebApp) {
      const tgWebApp = window.Telegram.WebApp;
      tgWebApp.ready();
      window.Telegram.WebApp.expand();
      const user = tgWebApp.initDataUnsafe.user;
      if (user) {
        setUserId(user.id);
      }
    }
  }, []);
  useEffect(() => {
    const fetchTokens = async () => {
      const response = await fetch('./tickers.json');
      const data = await response.json();
      setTokens(data);
       // Initially set the filtered tokens to the full list
    };
    fetchTokens();
  }, []);
  

  const handleTokenSelection = (symbol,net) => {
    if (selectingToken === 'from') {
      setFromToken(symbol);
      setFromNet(net);

    } else {
      setToToken(symbol);
      setToNet(net)
    }
    onClose();
  };

  const openTokenModal = (type) => {
    setSelectingToken(type);
    onOpen();
  };

  // Filter tokens for the "from" token modal
  const filteredFromTokens = tokens.filter((token) =>
    token.ticker.toLowerCase().includes(fromSearchQuery.toLowerCase())
  );

  // Filter tokens for the "to" token modal based only on "ticker"
  const filteredToTokens = tokens.filter((token) =>
    token.ticker.toLowerCase().includes(toSearchQuery.toLowerCase())
  );

  // Set the filtered tokens based on whether the "from" or "to" modal is open
  const filteredTokens = selectingToken === 'from' ? filteredFromTokens : filteredToTokens;

  // Function to toggle privacy mode on clicking anywhere on the switch
  const togglePrivacyMode = () => {
    setPrivacyMode((prevMode) => (prevMode === 'standard' ? 'private' : 'standard'));
  };
  useEffect(() => {
    
    const fetchTokens = async () => {
      const response = await fetch('./tickers.json');
      const data = await response.json();
      setTokens(data);
       // Initially set the filtered tokens to the full list
    };
    fetchTokens();
  }, []);
 
  useEffect(() => {
    fetchExchangeRate(privacyMode);
    
  }, [privacyMode]); 
  const fetchExchangeRate = async (privacyMode) => {
    if (!fromNet || !toNet || !sendAmount) {
      setFeeAmount('');
      setReceivedAmount('');
      return;
    }
    setLoadingRate(true);
    console.log(privacyMode);
    const requestBody = {
      fromNetwork: fromNet,
      toNetwork: toNet,
      amount: sendAmount,
      fromCurrency: fromToken.toUpperCase(),
      toCurrency: toToken,
      privacy: privacyMode === 'private', 
    };

   

    try {
      const response = await fetch('/api/estimate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const result = await response.json();

      if (response.ok) {
        setFeeAmount(result.data.fee);
        setReceivedAmount(result.data.amount);
      } else {
        console.error('Error fetching exchange rate:', result);
        setFeeAmount('');
        setReceivedAmount('');
      }
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
      setFeeAmount('');
      setReceivedAmount('');
    } finally {
        setLoadingRate(false);
    }
  };
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      if (fromNet && toNet && sendAmount) {
        fetchExchangeRate(privacyMode);
      } else {
        setReceivedAmount('');
        setFeeAmount('');
      }
    }, 500);

    return () => {
      clearTimeout(debounceTimer.current);
    };
  }, [fromNet, toNet, sendAmount]);
  const handleExchange = async () => {
    if (!sendAmount || parseFloat(sendAmount) <= 0) {
      ;
      setErrorMessage('Please enter the amount you want to send.');
      
      return;
    }
  
    if (!recipientAddress.trim()) {
     
      setErrorMessage('Please enter the recipient address.');
      
      return;
    }

    const requestBody = {
        fromNetwork: fromNet,
        toNetwork: toNet,
        amount: sendAmount,
        fromCurrency: fromToken,
        toCurrency: toToken,
        recipientAddress: recipientAddress.trim(),
        userId:userId ? userId.toString() : null ,
        privacy: privacyMode === 'private',
    };
  
   
    setErrorMessage('');
  
    try {
      const response = await fetch('/api/bridge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
  
      const result = await response.json();
  
      if (response.ok) {
        if (result.status === 500) {
          
          setErrorMessage(result.data);
       
        } else {
          Telegram.WebApp.openTelegramLink('https://t.me/ton_mix_bot');
          Telegram.WebApp.close();
        
          setErrorMessage(''); 
        }
      } else {
        console.error('Error creating exchange:', result);
      
        setErrorMessage(`Error creating exchange: ${result.data}`);
       
      }
    } catch (error) {
      
      setErrorMessage('id');
      
    } finally {
      
    }
  };


  return (
    <Box 
  minH="100vh" 
  display="flex" 
  flexDirection="column" 
  justifyContent="center" 
  alignItems="center" 
  bg="rgba(0, 0, 0, 0)"  // Black with 60% opacity
  color="white"
  position="relative"
>

         {/* Logo and Wallet Connect Button */}
      
      {/* Box container */}
      <VStack 
        spacing={4} 
        p={10} 
        bg="gray.800" 
        borderRadius="20" 
        w={["88%", "50%", "90%"]}
      
        boxShadow={privacyMode === 'private' ? "0px 0px 15px rgba(0, 255, 0, 0.6)" : "0px 0px 15px rgba(144,212,238)"}
        border={privacyMode === 'private' ? "1px solid rgba(0, 255, 0, 0.5)" : "1px solid rgba(144,212,238)"}
      >
        <HStack spacing={4} alignItems="center">
  <Image src="./favicon-1.png" alt="Logo" boxSize="50px" />
  <Text fontSize="2xl" fontWeight="bold">
    Mixer Exchange
  </Text>
</HStack>
        
        <Text fontSize="md" color="gray.400">
          Quick & Easy, Just Mix it
        </Text>

        {/* Privacy Mode Toggle - Entire HStack is clickable */}
        <Box
          as="button"
          onClick={togglePrivacyMode}
          w="fit-content"
          p={1}
          bg="gray.700"
          borderRadius="lg"
        >
          <HStack spacing={0}>
            {/* Standard Mode Button (appears like a button, but controlled by the parent Box click) */}
            <Button
              
              colorScheme={privacyMode === 'standard' ? 'blue' : 'gray'}
              variant={privacyMode === 'standard' ? 'solid' : 'ghost'}
              borderRadius="lg"
              px={6}
              pointerEvents="none"  // Disable individual button clicks
            >
              😶 Standard
            </Button>

            {/* Private Mode Button */}
            <Button
              leftIcon={<FaLock />}
              colorScheme={privacyMode === 'private' ? 'green' : 'gray'}
              variant={privacyMode === 'private' ? 'solid' : 'ghost'}
              borderRadius="lg"
              px={6}
              pointerEvents="none"  // Disable individual button clicks
            >
              Private
            </Button>
          </HStack>
        </Box>

        {/* Send Section */}
        <VStack align="stretch" w="100%" spacing={2} mt={1}>
          <Text color="gray.400">You Send</Text>
          <Flex alignItems="center" bg="gray.700" p={3} borderRadius="30" position="relative">
            <Input
              placeholder="0"
              value={sendAmount}
              onChange={(e) => setSendAmount(e.target.value)}
              size="lg"
              variant="unstyled"
              color="white"
              flex="1"
            />
            {/* Line Separator */}
            <Divider orientation="vertical" borderColor={privacyMode === 'private' ? "rgba(0, 255, 0, 0.5)" : " rgba(59,114,149)"} h="70%" mx={2} />  {/* Green or Blue hue */}
            <Button
            onClick={() => openTokenModal('from')}
            size="lg"
            variant="unstyled"
            color="white"
            ml={2}
            display="flex"
            alignItems="center"
            >
            <VStack align="flex-start" spacing={0}> 
                <Text>{fromToken.toUpperCase()}</Text>  {/* Token ticker */}
                <Text fontSize="sm" color="gray.400">{fromNet.toUpperCase()}</Text> {/* Network name */}
            </VStack>
            <FiChevronDown style={{ marginLeft: '8px' }} /> {/* Dropdown arrow */}
            </Button>
       
          </Flex>
        </VStack>

        {/* Swap Arrow Button */}
        <Flex justify="center" align="center" w="100%" mt={0}>
          <IconButton
            aria-label="Swap tokens"
            icon={<FaArrowsRotate />}
            size="40"
            variant="ghost"
            color="gray.400"
            _hover={{ color: 'white' }}
            onClick={() => {
              const _toToken = toToken;
              const _toNet = toNet;
              const _fromToken = fromToken;
              const _fromNet = fromNet;

              setToToken(_fromToken);
              setToNet(_fromNet);
              setFromToken(_toToken);
              setFromNet(_toNet);

              onClose();
            }}
          />
        </Flex>

        {/* Receive Section */}
        <VStack align="stretch" w="100%" spacing={1}>
          <Text color="gray.400">You Get</Text>
          <Flex alignItems="center" bg="gray.700" p={3} borderRadius="25" position="relative">
            <Input
              placeholder={loadingRate ? 'Calculating...' : '0'}
              value={loadingRate ? '' : receiveAmount}
              readOnly
              size="lg"
              variant="unstyled"
              color="white" 
              flex="1"
            />
            {/* Line Separator */}
            <Divider orientation="vertical" borderColor={privacyMode === 'private' ? "rgba(0, 255, 0, 0.5)" : "rgba(59,114,149)"} h="70%" mx={2} />  {/* Green or Blue hue */}
                        <Button
            onClick={() => openTokenModal('to')}
            size="lg"
            variant="unstyled"
            color="white"
            ml={2}
            display="flex"
            alignItems="center"
            >
            <VStack align="flex-start" spacing={0}> 
                <Text>{toToken.toUpperCase()}</Text>  {/* Token ticker */}
                <Text fontSize="sm" color="gray.400">{toNet.toUpperCase()}</Text> {/* Network name */}
            </VStack>
            <FiChevronDown style={{ marginLeft: '8px' }} /> {/* Dropdown arrow */}
            </Button>
          </Flex>
        </VStack>
        {/* Fees Section */}
        <Text color="gray.400" mt={1}>
          Estimated Fees: {loadingRate ? '...' : fees === undefined || fees === null || fees === '' ? '$0.00' : `$${fees}`}
        </Text>

        {/* Recipient Address Section */}
        <VStack align="stretch" w="100%" spacing={2} mt={4}>
          <Text color="gray.400">Recipient Address</Text>
          <Input
            placeholder="Enter recipient address"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            size="lg"
            variant="filled"
            bg="gray.700"
            color="white"
          />
        </VStack>

        {/* Exchange Button */}
        {errorMessage && (  // Show error message if present
          <Text color="red.500" mt={4}>
            {errorMessage}
          </Text>
        )}
        <Button
          colorScheme="green"
          bg="green.600"
          _hover={{ bg: "green.500" }}
          size="lg"
          isFullWidth
          onClick={handleExchange} 
          
        >
          Exchange
        </Button>
      </VStack>

      {/* Token Selection Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg" motionPreset="slideInBottom">
      <ModalOverlay 
        bg="rgba(0, 0, 0, 0.8)" // Dark overlay for background blur
        backdropFilter="blur(10px)" // Blur effect for background
      />
      <ModalContent 
        bg="gray.800" 
        color="white" 
        borderRadius="lg" 
        boxShadow={privacyMode === 'private' ? "0 4px 10px rgba(0, 255, 0, 0.2)" : "0 4px 10px rgba(0, 0, 255, 0.2)"}
        maxH="80vh" // Fix the size and make it scrollable
      >
        <ModalHeader>Select Token</ModalHeader>
        <ModalBody overflowY="auto">  {/* Scrollable content */}
          <InputGroup mb={4}>
            <Input 
              placeholder="Search assets or address" 
              variant="filled" 
              bg="gray.700"
              onChange={(e) => selectingToken === 'from' ? setFromSearchQuery(e.target.value) : setToSearchQuery(e.target.value)}
            />
            <InputRightElement children={<FiSearch color="gray.400" />} />
          </InputGroup>

          <VStack spacing={3} align="stretch">
          {filteredTokens.map((token, index) => (
              <Box 
                key={`${token.ticker}-${index}`}  // Use unique key based on ticker and index
                p={3} 
                bg="gray.700" 
                borderRadius="md" 
                boxShadow="0 4px 10px rgba(0, 0, 255, 0.2)" 
                onClick={() => handleTokenSelection(token.ticker,token.network)}
              >
                <HStack justify="space-between">
                  <VStack align="flex-start">
                    <Text fontWeight="bold">{token.ticker.toUpperCase()}</Text>
                    <Text fontSize="sm" color="gray.400">{token.network.toUpperCase()}</Text>
                  </VStack>
                </HStack>
                <Divider borderColor="gray.600" mt={2} />
              </Box>
            ))}
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button colorScheme="gray" onClick={onClose} w="full" position="sticky" bottom={0}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  
    </Box>
  );
}

export default Exchange;
