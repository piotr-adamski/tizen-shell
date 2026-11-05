# tizen-shell

Klient SSH z czterema panelami dla telewizorów Samsung z Tizenem. Telewizor obsługuje klawiaturę, obraz i bezpośrednie połączenie SSH; powłoka oraz narzędzia działają na Twoim serwerze Linux. Bez bramki WebSSH.

[English](README.md) · [Budowanie i instalacja](docs/BUILD.md) · [Obsługa](docs/USAGE.md) · [Bezpieczeństwo](SECURITY.md)

**Wymagana jest fizyczna klawiatura. Zalecana jest mysz.** Pilot obsługuje menu i przyciski, ale nie zastąpi klawiatury podczas pracy w terminalu, wpisywania haseł i konfiguracji. Klawiaturę ekranową wyłączono celowo. Sprawdzono wejście USB; Bluetooth zależy od konkretnego TV i klawiatury.

> **Ostrzeżenie o prywatności:** system telewizora i jego producent pozostają poza kontrolą aplikacji. Uprzywilejowane oprogramowanie TV ma techniczną możliwość podejrzenia wpisywanych znaków, obrazu terminala, danych logowania oraz kluczy prywatnych odszyfrowanych w pamięci. SSH chroni połączenie sieciowe, ale nie ukrywa pracy przed samym telewizorem. To opis zagrożenia, nie twierdzenie, że Samsung faktycznie przechwytuje Twoje sesje. Nie używaj tego klienta do danych, których nie możesz powierzyć TV. Przeczytaj [SECURITY.md](SECURITY.md).

## Funkcje

Cztery równoległe SSH, cztery osobne klucze Ed25519, trwałe sesje `tmux`, układy Siatka/Fokus/Kolumny/Wiersze, powiększanie panelu, skróty Super inspirowane Omarchy oraz prefiks Ctrl+B. Kod, biblioteki i font są lokalne. Aplikacja nie ma analityki ani zapisu transkryptu terminala.

## Stan

**Eksperymentalne wydanie źródłowe 0.4.0-alpha.1.** Starszą wersję 0.3.3 sprawdzono na Samsung QE50Q67BAUXXH / Tizen 6.5, w tym cztery powłoki i fizyczny wybór panelu klawiszem Super. Kandydat do publikacji usuwa dane środowiska, pozwala wskazać własnego użytkownika SSH oraz dodaje przenośne budowanie i komplet informacji licencyjnych. Nie zakończył pełnego odbioru na wszystkich modelach ani całego zestawu prób długotrwałych i cyklu życia. [Ograniczenia](docs/COMPATIBILITY.md).

## Uruchomienie

Zainstaluj oficjalne narzędzia Samsunga, utwórz profil certyfikatów dla własnego TV, zbuduj i podpisz pakiet według [BUILD.md](docs/BUILD.md). Repozytorium nie zawiera naszego pakietu podpisanego dla urządzenia, kluczy, certyfikatów ani konfiguracji serwera.

W aplikacji podaj własny host, port, użytkownika bez uprawnień administratora i niezależnie zweryfikowany odcisk klucza hosta. `tvuser` jest wyłącznie neutralną wartością początkową. Wygeneruj cztery klucze na TV i dodaj ich części publiczne do właściwego konta na serwerze. **Połącz 4** pyta o hasło ochronne raz dla bieżącej grupy połączeń; aplikacja go nie zapisuje.

Pierwszy autor: **Piotr Adamski (piotr-adamski)**. Kod własny udostępniamy na **Apache-2.0**. Zachowaj LICENSE, NOTICE, AUTHORS.md i właściwe informacje o zależnościach. [Łańcuch komponentów i autorstwa](THIRD_PARTY_NOTICES.md).
