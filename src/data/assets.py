"""
Arquivo de configuração para ativos e horários de operação.
Contém as categorias dos ativos e seus horários específicos de funcionamento.
"""

# Categorias dos ativos
ATIVOS_CATEGORIAS = {
    # Ativos Blitz
    "USD/BRL (OTC)": "Blitz",
    "USOUSD (OTC)": "Blitz",
    "BTC/USD (OTC)": "Blitz",
    "Google (OTC)": "Blitz",
    "EUR/JPY (OTC)": "Blitz",
    "ETH/USD (OTC)": "Blitz",
    "MELANIA Coin (OTC)": "Binary",
    "EUR/GBP (OTC)": "Blitz",
    "Apple (OTC)": "Blitz",
    "Amazon (OTC)": "Blitz",
    "TRUMP Coin (OTC)": "Binary",
    "Nike, Inc. (OTC)": "Blitz",
    "DOGECOIN (OTC)": "Blitz",
    "Tesla (OTC)": "Blitz",
    "SOL/USD (OTC)": "Blitz",
    "1000Sats (OTC)": "Binary",
    "McDonald´s Corporation (OTC)": "Blitz",
    "Meta (OTC)": "Blitz",
    "Coca-Cola Company (OTC)": "Blitz",
    "CARDANO (OTC)": "Blitz",
    "EUR/USD (OTC)": "Blitz",
    "PEN/USD (OTC)": "Blitz",
    "Bitcoin Cash (OTC)": "Binary",
    "AUD/CAD (OTC)": "Blitz",
    "Tesla/Ford (OTC)": "Blitz",
    "US 100 (OTC)": "Binary",
    "TRON/USD (OTC)": "Blitz",
    "USD/CAD (OTC)": "Blitz",
    "AUD/USD (OTC)": "Blitz",
    "AIG (OTC)": "Binary",
    "Alibaba Group Holding (OTC)": "Blitz",
    "Snap Inc. (OTC)": "Blitz",
    "AUD/CHF (OTC)": "Blitz",
    "Amazon/Alibaba (OTC)": "Blitz",
    "Pepe (OTC)": "Binary",
    "Chainlink (OTC)": "Binary",
    "USD/ZAR (OTC)": "Blitz",
    "Worldcoin (OTC)": "Binary",
    # Ativos Binary serão adicionados a seguir
    "Litecoin (OTC)": "Binary",
    "Injective (OTC)": "Binary",
    "ORDI (OTC)": "Binary",
    "ICP (OTC)": "Binary",
    "Cosmos (OTC)": "Binary",
    "Polkadot (OTC)": "Binary",
    "TON (OTC)": "Binary",
    "Celestia (OTC)": "Binary",
    "NEAR (OTC)": "Binary",
    "Ripple (OTC)": "Binary",
    "Ronin (OTC)": "Binary",
    "Stacks (OTC)": "Binary",
    "Immutable (OTC)": "Binary",
    "EOS (OTC)": "Binary",
    "Jupiter (OTC)": "Binary",
    "Polygon (OTC)": "Binary",
    "Arbitrum (OTC)": "Binary",
    "Sandbox (OTC)": "Binary",
    "Decentraland (OTC)": "Binary",
    "Sei (OTC)": "Binary",
    "IOTA (OTC)": "Binary",
    "Pyth (OTC)": "Binary",
    "Graph (OTC)": "Binary",
    "Floki (OTC)": "Binary",
    "Gala (OTC)": "Binary",
    "Bonk (OTC)": "Binary",
    "Beam (OTC)": "Binary",
    "Hamster Kombat (OTC)": "Binary",
    "NOT (OTC)": "Binary",
    "US 30 (OTC)": "Binary",
    "JP 225 (OTC)": "Binary",
    "HK 33 (OTC)": "Binary",
    "GER 30 (OTC)": "Binary",
    "SP 35 (OTC)": "Binary",
    "UK 100 (OTC)": "Binary",
    # Ativos Digital
    "Gold/Silver (OTC)": "Digital",
    "Worldcoin (OTC)": "Digital",
    "USD/THB (OTC)": "Digital",
    "ETH/USD (OTC)": "Digital",
    "CHF/JPY (OTC)": "Digital",
    "Pepe (OTC)": "Digital",
    "GBP/AUD (OTC)": "Digital",
    "GBP/CHF": "Digital",
    "GBP/CAD (OTC)": "Digital",
    "EUR/JPY (OTC)": "Digital",
    "AUD/CHF": "Digital",
    "GER 30 (OTC)": "Digital",
    "AUD/CHF (OTC)": "Digital",
    "EUR/AUD": "Digital", 
    "USD/CAD (OTC)": "Digital",
    "BTC/USD": "Digital",
    "Amazon/Ebay (OTC)": "Digital",
    "Coca-Cola Company (OTC)": "Digital",
    "AIG (OTC)": "Digital",
    "Amazon/Alibaba (OTC)": "Digital",
    "Bitcoin Cash (OTC)": "Digital",
    "AUD/USD": "Digital",
    "DASH (OTC)": "Digital",
    "BTC/USD (OTC)": "Digital",
    "SP 35 (OTC)": "Digital",
    "TRUMP Coin (OTC)": "Digital",
    "US 100 (OTC)": "Digital",
    "EUR/CAD (OTC)": "Digital",
    "HK 33 (OTC)": "Digital",
    "Alphabet/Microsoft (OTC)": "Digital",
    "1000Sats (OTC)": "Digital",
    "USD/ZAR (OTC)": "Digital",
    "Litecoin (OTC)": "Digital",
    "Hamster Kombat (OTC)": "Digital",
    "USD Currency Index (OTC)": "Digital",
    "AUS 200 (OTC)": "Digital",
    "USD/CAD": "Digital",
    "MELANIA Coin (OTC)": "Digital",
    "JP 225 (OTC)": "Digital",
    "AUD/CAD (OTC)": "Digital",
    "AUD/JPY (OTC)": "Digital",
    "US 500 (OTC)": "Digital"
}

# Configurações de horários específicos para cada ativo
HORARIOS_PADRAO = {
    "USD/BRL_OTC": {
        "Monday": ["00:00-23:59"],
        "Tuesday": ["00:00-00:45", "01:15-23:59"],
        "Wednesday": ["00:00-23:59"],
        "Thursday": ["00:00-23:59"],
        "Friday": ["00:00-23:59"],
        "Saturday": ["00:00-23:59"],
        "Sunday": ["00:00-23:59"]
    },
    "USOUSD_OTC": {
        "Monday": ["00:00-23:59"],
        "Tuesday": ["00:00-23:59"],
        "Wednesday": ["00:00-23:59"],
        "Thursday": ["00:00-06:00", "06:30-23:59"],
        "Friday": ["00:00-23:59"],
        "Saturday": ["00:00-23:59"],
        "Sunday": ["00:00-23:59"]
    },
    "BTC/USD_OTC": {
        "Monday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Tuesday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Wednesday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Thursday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Friday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Saturday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Sunday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"]
    },
    "Google_OTC": {
        "Monday": ["00:00-15:30", "16:00-23:59"],
        "Tuesday": ["00:00-23:59"],
        "Wednesday": ["00:00-15:30", "16:00-23:59"],
        "Thursday": ["00:00-23:59"],
        "Friday": ["00:00-15:30", "16:00-23:59"],
        "Saturday": ["00:00-23:59"],
        "Sunday": ["00:00-23:59"]
    },
    "EUR/JPY_OTC": {
        "Monday": ["00:00-23:59"],
        "Tuesday": ["00:00-23:59"],
        "Wednesday": ["00:00-01:00", "01:15-23:59"],
        "Thursday": ["00:00-23:59"],
        "Friday": ["00:00-23:59"],
        "Saturday": ["00:00-23:59"],
        "Sunday": ["00:00-23:59"]
    },
    "ETH/USD_OTC": {
        "Monday": ["00:00-18:45", "19:15-23:59"],
        "Tuesday": ["00:00-18:45", "19:15-23:59"],
        "Wednesday": ["00:00-18:45", "19:15-23:59"],
        "Thursday": ["00:00-18:45", "19:15-23:59"],
        "Friday": ["00:00-18:45", "19:15-23:59"],
        "Saturday": ["00:00-18:45", "19:15-23:59"],
        "Sunday": ["00:00-18:45", "19:15-23:59"]
    },
    "MELANIA_COIN_OTC": {
        "Monday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Tuesday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Wednesday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Thursday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Friday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Saturday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Sunday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"]
    },
    "EUR/GBP_OTC": {
        "Monday": ["00:00-23:59"],
        "Tuesday": ["00:00-23:59"],
        "Wednesday": ["00:00-01:00", "01:15-23:59"],
        "Thursday": ["00:00-23:59"],
        "Friday": ["00:00-23:59"],
        "Saturday": ["00:00-23:59"],
        "Sunday": ["00:00-23:59"]
    },
    "Apple_OTC": {
        "Monday": ["00:00-15:30", "16:00-23:59"],
        "Tuesday": ["00:00-23:59"],
        "Wednesday": ["00:00-15:30", "16:00-23:59"],
        "Thursday": ["00:00-23:59"],
        "Friday": ["00:00-15:30", "16:00-23:59"],
        "Saturday": ["00:00-23:59"],
        "Sunday": ["00:00-23:59"]
    },
    "Amazon_OTC": {
        "Monday": ["00:00-15:30", "16:00-23:59"],
        "Tuesday": ["00:00-23:59"],
        "Wednesday": ["00:00-15:30", "16:00-23:59"],
        "Thursday": ["00:00-23:59"],
        "Friday": ["00:00-15:30", "16:00-23:59"],
        "Saturday": ["00:00-23:59"],
        "Sunday": ["00:00-23:59"]
    },
    "TRUM_Coin_OTC": {
        "Monday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Tuesday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Wednesday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Thursday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Friday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Saturday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Sunday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"]
    },
    "Nike_Inc_OTC": {
        "Monday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Tuesday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Wednesday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Thursday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Friday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Saturday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Sunday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"]
    },
    "DOGECOIN_OTC": {
        "Monday": ["00:00-05:45", "06:15-17:45", "18:15-23:59"],
        "Tuesday": ["00:00-05:45", "06:15-17:45", "18:15-23:59"],
        "Wednesday": ["00:00-05:45", "06:15-17:45", "18:15-23:59"],
        "Thursday": ["00:00-05:45", "06:15-17:45", "18:15-23:59"],
        "Friday": ["00:00-05:45", "06:15-17:45", "18:15-23:59"],
        "Saturday": ["00:00-05:45", "06:15-17:45", "18:15-23:59"],
        "Sunday": ["00:00-05:45", "06:15-17:45", "18:15-23:59"]
    },
    "Tesla_OTC": {
        "Monday": ["00:00-15:30", "16:00-23:59"],
        "Tuesday": ["00:00-23:59"],
        "Wednesday": ["00:00-15:30", "16:00-23:59"],
        "Thursday": ["00:00-23:59"],
        "Friday": ["00:00-15:30", "16:00-23:59"],
        "Saturday": ["00:00-23:59"],
        "Sunday": ["00:00-23:59"]
    },
    "SOL/USD_OTC": {
        "Monday": ["00:00-05:45", "06:15-17:45", "18:15-23:59"],
        "Tuesday": ["00:00-05:45", "06:15-17:45", "18:15-23:59"],
        "Wednesday": ["00:00-05:45", "06:15-17:45", "18:15-23:59"],
        "Thursday": ["00:00-05:45", "06:15-17:45", "18:15-23:59"],
        "Friday": ["00:00-05:45", "06:15-17:45", "18:15-23:59"],
        "Saturday": ["00:00-05:45", "06:15-17:45", "18:15-23:59"],
        "Sunday": ["00:00-05:45", "06:15-17:45", "18:15-23:59"]
    },
    "1000Sats_OTC": {
        "Monday": ["00:00-05:05", "05:10-12:05", "12:10-23:59"],
        "Tuesday": ["00:00-05:05", "05:10-12:05", "12:10-23:59"],
        "Wednesday": ["00:00-05:05", "05:10-12:05", "12:10-23:59"],
        "Thursday": ["00:00-05:05", "05:10-12:05", "12:10-23:59"],
        "Friday": ["00:00-05:05", "05:10-12:05", "12:10-23:59"],
        "Saturday": ["00:00-05:05", "05:10-12:05", "12:10-23:59"],
        "Sunday": ["00:00-05:05", "05:10-12:05", "12:10-23:59"]
    },
    "XAUUSD_OTC": {
        "Monday": ["00:00-23:59"],
        "Tuesday": ["00:00-23:59"],
        "Wednesday": ["00:00-23:59"],
        "Thursday": ["00:00-06:00", "06:30-23:59"],
        "Friday": ["00:00-23:59"],
        "Saturday": ["00:00-23:59"],
        "Sunday": ["00:00-23:59"]
    },
    "McDonalds_Corporation_OTC": {
        "Monday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Tuesday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Wednesday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Thursday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Friday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Saturday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Sunday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"]
    },
    "Meta_OTC": {
        "Monday": ["00:00-15:30", "16:00-23:59"],
        "Tuesday": ["00:00-23:59"],
        "Wednesday": ["00:00-15:30", "16:00-23:59"],
        "Thursday": ["00:00-23:59"],
        "Friday": ["00:00-15:30", "16:00-23:59"],
        "Saturday": ["00:00-23:59"],
        "Sunday": ["00:00-23:59"]
    },
    "Coca_Cola_Company_OTC": {
        "Monday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Tuesday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Wednesday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Thursday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Friday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Saturday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Sunday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"]
    },
    "CARDANO_OTC": {
        "Monday": ["00:00-05:45", "06:15-17:45", "18:15-23:59"],
        "Tuesday": ["00:00-05:45", "06:15-17:45", "18:15-23:59"],
        "Wednesday": ["00:00-05:45", "06:15-17:45", "18:15-23:59"],
        "Thursday": ["00:00-05:45", "06:15-17:45", "18:15-23:59"],
        "Friday": ["00:00-05:45", "06:15-17:45", "18:15-23:59"],
        "Saturday": ["00:00-05:45", "06:15-17:45", "18:15-23:59"],
        "Sunday": ["00:00-05:45", "06:15-17:45", "18:15-23:59"]
    },
    "EUR/USD_OTC": {
        "Monday": ["00:00-23:59"],
        "Tuesday": ["00:00-23:59"],
        "Wednesday": ["00:00-01:00", "01:15-23:59"],
        "Thursday": ["00:00-23:59"],
        "Friday": ["00:00-23:59"],
        "Saturday": ["00:00-23:59"],
        "Sunday": ["00:00-23:59"]
    },
    "PEN/USD_OTC": {
        "Monday": ["00:00-23:59"],
        "Tuesday": ["00:00-00:45", "01:15-23:59"],
        "Wednesday": ["00:00-23:59"],
        "Thursday": ["00:00-23:59"],
        "Friday": ["00:00-23:59"],
        "Saturday": ["00:00-23:59"],
        "Sunday": ["00:00-23:59"]
    },
    "Bitcoin_Cash_OTC": {
        "Monday": ["00:00-05:05", "05:10-12:05", "12:10-23:59"],
        "Tuesday": ["00:00-05:05", "05:10-12:05", "12:10-23:59"],
        "Wednesday": ["00:00-05:05", "05:10-12:05", "12:10-23:59"],
        "Thursday": ["00:00-05:05", "05:10-12:05", "12:10-23:59"],
        "Friday": ["00:00-05:05", "05:10-12:05", "12:10-23:59"],
        "Saturday": ["00:00-05:05", "05:10-12:05", "12:10-23:59"],
        "Sunday": ["00:00-05:05", "05:10-12:05", "12:10-23:59"]
    },
    "AUD/CAD_OTC": {
        "Monday": ["00:00-23:59"],
        "Tuesday": ["00:00-23:59"],
        "Wednesday": ["00:00-01:00", "01:15-23:59"],
        "Thursday": ["00:00-23:59"],
        "Friday": ["00:00-23:59"],
        "Saturday": ["00:00-23:59"],
        "Sunday": ["00:00-23:59"]
    },
    "Tesla/Ford_OTC": {
        "Monday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Tuesday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Wednesday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Thursday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Friday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Saturday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Sunday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"]
    },
    "US_100_OTC": {
        "Monday": ["00:00-11:30", "12:00-17:30", "18:00-23:59"],
        "Tuesday": ["00:00-11:30", "12:00-17:30", "18:00-23:59"],
        "Wednesday": ["00:00-11:30", "12:00-17:30", "18:00-23:59"],
        "Thursday": ["00:00-11:30", "12:00-17:30", "18:00-23:59"],
        "Friday": ["00:00-23:59"],
        "Saturday": ["00:00-23:59"],
        "Sunday": ["00:00-11:30", "12:00-17:30", "18:00-23:59"]
    },
    "Gold_Silver_OTC": {
        "Monday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Tuesday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Wednesday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Thursday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Friday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Saturday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Sunday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"]
    },
    "Worldcoin_OTC": {
        "Monday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Tuesday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Wednesday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Thursday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Friday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Saturday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Sunday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"]
    },
    "USD_THB_OTC": {
        "Monday": ["00:00-03:00", "03:30-22:00", "22:30-23:59"],
        "Tuesday": ["00:00-03:00", "03:30-22:00", "22:30-23:59"],
        "Wednesday": ["00:00-03:00", "03:30-22:00", "22:30-23:59"],
        "Thursday": ["00:00-03:00", "03:30-22:00", "22:30-23:59"],
        "Friday": ["00:00-03:00", "03:30-22:00", "22:30-23:59"],
        "Saturday": ["00:00-03:00", "03:30-22:00", "22:30-23:59"],
        "Sunday": ["00:00-03:00", "03:30-22:00", "22:30-23:59"]
    },
    "CHF_JPY_OTC": {
        "Monday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Tuesday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Wednesday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Thursday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Friday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Saturday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Sunday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"]
    },
    "Pepe_OTC": {
        "Monday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Tuesday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Wednesday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Thursday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Friday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Saturday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Sunday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"]
    },
    "GBP_AUD_OTC": {
        "Monday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Tuesday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Wednesday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Thursday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Friday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Saturday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Sunday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"]
    },
    "GBP_CHF": {
        "Monday": ["00:00-16:00"],
        "Tuesday": ["00:00-16:00"],
        "Wednesday": ["00:00-16:00"],
        "Thursday": ["00:00-16:00"],
        "Friday": ["00:00-14:00"],
        "Saturday": [],
        "Sunday": []
    },
    "GBP_CAD_OTC": {
        "Monday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Tuesday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Wednesday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Thursday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Friday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Saturday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Sunday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"]
    },
    "AUD_CHF": {
        "Monday": ["00:00-16:00"],
        "Tuesday": ["00:00-16:00"],
        "Wednesday": ["00:00-16:00"],
        "Thursday": ["00:00-16:00"],
        "Friday": ["00:00-14:00"],
        "Saturday": [],
        "Sunday": []
    },
    "GER_30_OTC": {
        "Monday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Tuesday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Wednesday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Thursday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Friday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Saturday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Sunday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"]
    },
    "AUD_CHF_OTC": {
        "Monday": ["00:00-03:00", "03:30-22:00", "22:30-23:59"],
        "Tuesday": ["00:00-03:00", "03:30-22:00", "22:30-23:59"],
        "Wednesday": ["00:00-03:00", "03:30-22:00", "22:30-23:59"],
        "Thursday": ["00:00-03:00", "03:30-22:00", "22:30-23:59"],
        "Friday": ["00:00-03:00", "03:30-22:00", "22:30-23:59"],
        "Saturday": ["00:00-03:00", "03:30-22:00", "22:30-23:59"],
        "Sunday": ["00:00-03:00", "03:30-22:00", "22:30-23:59"]
    },
    "EUR_AUD": {
        "Monday": ["00:00-16:00"],
        "Tuesday": ["00:00-16:00"],
        "Wednesday": ["00:00-16:00"],
        "Thursday": ["00:00-16:00"],
        "Friday": ["00:00-14:00"],
        "Saturday": [],
        "Sunday": []
    },
    "BTC_USD": {
        "Monday": ["03:00-15:00"],
        "Tuesday": ["03:00-15:00"],
        "Wednesday": ["03:00-15:00"],
        "Thursday": ["03:00-15:00"],
        "Friday": ["03:00-15:00"],
        "Saturday": [],
        "Sunday": []
    },
    "Amazon_Ebay_OTC": {
        "Monday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Tuesday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Wednesday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Thursday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Friday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Saturday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Sunday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"]
    },
    "Alphabet_Microsoft_OTC": {
        "Monday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Tuesday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Wednesday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Thursday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Friday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Saturday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
        "Sunday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"]
    },
    "USD_Currency_Index_OTC": {
        "Monday": ["00:00-10:00", "10:30-22:00", "22:30-23:59"],
        "Tuesday": ["00:00-10:00", "10:30-22:00", "22:30-23:59"],
        "Wednesday": ["00:00-10:00", "10:30-22:00", "22:30-23:59"],
        "Thursday": ["00:00-10:00", "10:30-22:00", "22:30-23:59"],
        "Friday": ["00:00-10:00", "10:30-18:00"],
        "Saturday": [],
        "Sunday": ["19:00-23:59"]
    },
    "USD_CAD": {
        "Monday": ["03:00-15:00"],
        "Tuesday": ["03:00-15:00", "21:00-23:59"],
        "Wednesday": ["00:00-15:00"],
        "Thursday": ["03:00-15:00"],
        "Friday": ["03:00-15:00"],
        "Saturday": [],
        "Sunday": []
    }
}

# Mapeamento de ativos para padrões de horários
assets = {
    "USD/BRL (OTC)": HORARIOS_PADRAO["USD/BRL_OTC"],
    "USOUSD (OTC)": HORARIOS_PADRAO["USOUSD_OTC"],
    "BTC/USD (OTC)": HORARIOS_PADRAO["BTC/USD_OTC"],
    "Google (OTC)": HORARIOS_PADRAO["Google_OTC"],
    "EUR/JPY (OTC)": HORARIOS_PADRAO["EUR/JPY_OTC"],
    "ETH/USD (OTC)": HORARIOS_PADRAO["ETH/USD_OTC"],
    "MELANIA Coin (OTC)": HORARIOS_PADRAO["MELANIA_COIN_OTC"],
    "EUR/GBP (OTC)": HORARIOS_PADRAO["EUR/GBP_OTC"],
    "Apple (OTC)": HORARIOS_PADRAO["Apple_OTC"],
    "Amazon (OTC)": HORARIOS_PADRAO["Amazon_OTC"],
    "TRUMP Coin (OTC)": HORARIOS_PADRAO["TRUM_Coin_OTC"],
    "Nike, Inc. (OTC)": HORARIOS_PADRAO["Nike_Inc_OTC"],
    "DOGECOIN (OTC)": HORARIOS_PADRAO["DOGECOIN_OTC"],
    "Tesla (OTC)": HORARIOS_PADRAO["Tesla_OTC"],
    "SOL/USD (OTC)": HORARIOS_PADRAO["SOL/USD_OTC"],
    "1000Sats (OTC)": HORARIOS_PADRAO["1000Sats_OTC"],
    "XAUUSD (OTC)": HORARIOS_PADRAO["XAUUSD_OTC"],
    "McDonald´s Corporation (OTC)": HORARIOS_PADRAO["McDonalds_Corporation_OTC"],
    "Meta (OTC)": HORARIOS_PADRAO["Meta_OTC"],
    "Coca-Cola Company (OTC)": HORARIOS_PADRAO["Coca_Cola_Company_OTC"],
    "CARDANO (OTC)": HORARIOS_PADRAO["CARDANO_OTC"],
    "EUR/USD (OTC)": HORARIOS_PADRAO["EUR/USD_OTC"],
    "PEN/USD (OTC)": HORARIOS_PADRAO["PEN/USD_OTC"],
    "Bitcoin Cash (OTC)": HORARIOS_PADRAO["Bitcoin_Cash_OTC"],
    "AUD/CAD (OTC)": HORARIOS_PADRAO["AUD/CAD_OTC"],
    "Tesla/Ford (OTC)": HORARIOS_PADRAO["Tesla/Ford_OTC"],
    "US 100 (OTC)": HORARIOS_PADRAO["US_100_OTC"],
    "Gold/Silver (OTC)": HORARIOS_PADRAO["Gold_Silver_OTC"],
    "Worldcoin (OTC)": HORARIOS_PADRAO["Worldcoin_OTC"],
    "USD/THB (OTC)": HORARIOS_PADRAO["USD_THB_OTC"],
    "CHF/JPY (OTC)": HORARIOS_PADRAO["CHF_JPY_OTC"],
    "Pepe (OTC)": HORARIOS_PADRAO["Pepe_OTC"],
    "GBP/AUD (OTC)": HORARIOS_PADRAO["GBP_AUD_OTC"],
    "GBP/CHF": HORARIOS_PADRAO["GBP_CHF"],
    "GBP/CAD (OTC)": HORARIOS_PADRAO["GBP_CAD_OTC"],
    "AUD/CHF": HORARIOS_PADRAO["AUD_CHF"],
    "GER 30 (OTC)": HORARIOS_PADRAO["GER_30_OTC"],
    "AUD/CHF (OTC)": HORARIOS_PADRAO["AUD_CHF_OTC"],
    "EUR/AUD": HORARIOS_PADRAO["EUR_AUD"],
    "BTC/USD": HORARIOS_PADRAO["BTC_USD"],
    "Amazon/Ebay (OTC)": HORARIOS_PADRAO["Amazon_Ebay_OTC"],
    "Alphabet/Microsoft (OTC)": HORARIOS_PADRAO["Alphabet_Microsoft_OTC"],
    "USD Currency Index (OTC)": HORARIOS_PADRAO["USD_Currency_Index_OTC"],
    "USD/CAD": HORARIOS_PADRAO["USD_CAD"]
}

def inicializar_horarios_ativos():
    """
    Adiciona horários padrão para todos os ativos listados em ATIVOS_CATEGORIAS
    que não têm uma configuração específica em assets.
    """
    for ativo in ATIVOS_CATEGORIAS:
        if ativo not in assets:
            # Define horário padrão baseado na categoria do ativo
            categoria = ATIVOS_CATEGORIAS[ativo]
            if categoria == "Blitz":
                assets[ativo] = {
                    "Monday": ["00:00-23:59"],
                    "Tuesday": ["00:00-23:59"],
                    "Wednesday": ["00:00-23:59"],
                    "Thursday": ["00:00-23:59"],
                    "Friday": ["00:00-23:59"],
                    "Saturday": ["00:00-23:59"],
                    "Sunday": ["00:00-23:59"]
                }
            elif categoria == "Digital":
                assets[ativo] = {
                    "Monday": ["00:00-23:59"],
                    "Tuesday": ["00:00-23:59"],
                    "Wednesday": ["00:00-23:59"],
                    "Thursday": ["00:00-23:59"],
                    "Friday": ["00:00-23:59"],
                    "Saturday": ["00:00-23:59"],
                    "Sunday": ["00:00-23:59"]
                }
            else:  # Binary e outros
                assets[ativo] = {
                    "Monday": ["00:00-23:59"],
                    "Tuesday": ["00:00-23:59"],
                    "Wednesday": ["00:00-23:59"],
                    "Thursday": ["00:00-23:59"],
                    "Friday": ["00:00-23:59"],
                    "Saturday": ["00:00-23:59"],
                    "Sunday": ["00:00-23:59"]
                } 