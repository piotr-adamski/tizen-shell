# tizen-shell

Klient SSH z czterema panelami dla telewizorów Samsung z Tizenem. Telewizor obsługuje klawiaturę, obraz i bezpośrednie połączenie SSH; powłoka oraz narzędzia działają na Twoim serwerze Linux. Bez bramki WebSSH.

[English](README.md) · [Budowanie i instalacja](docs/BUILD.md) · [Obsługa](docs/USAGE.md) · [Bezpieczeństwo](SECURITY.md)

**Wymagana jest fizyczna klawiatura. Zalecana jest mysz.** Pilot obsługuje menu i przyciski, ale nie zastąpi klawiatury podczas pracy w terminalu, wpisywania haseł i konfiguracji. Klawiaturę ekranową wyłączono celowo. Sprawdzono wejście USB; Bluetooth zależy od konkretnego TV i klawiatury.

**Pad Xbox Bluetooth może zastąpić mysz wewnątrz aplikacji.** Lewy analog przesuwa wskaźnik, A klika, prawy analog przewija, Menu otwiera Ustawienia, a B działa jako Wstecz. Obsługa myszy pozostaje. Pad nie zastąpi klawiatury do pisania. [Sterowanie padem](docs/USAGE.md#xbox-bluetooth-controller).

> **Ostrzeżenie o prywatności:** system telewizora i jego producent pozostają poza kontrolą aplikacji. Uprzywilejowane oprogramowanie TV ma techniczną możliwość podejrzenia wpisywanych znaków, obrazu terminala, danych logowania oraz kluczy prywatnych odszyfrowanych w pamięci. SSH chroni połączenie sieciowe, ale nie ukrywa pracy przed samym telewizorem. To opis zagrożenia, nie twierdzenie, że Samsung faktycznie przechwytuje Twoje sesje. Nie używaj tego klienta do danych, których nie możesz powierzyć TV. Przeczytaj [SECURITY.md](SECURITY.md).

## Funkcje

Cztery równoległe SSH, cztery osobne klucze Ed25519, trwałe sesje `tmux`, układy Siatka/Fokus/Kolumny/Wiersze, powiększanie panelu, skróty Super inspirowane Omarchy oraz prefiks Ctrl+B. Kod, biblioteki i font są lokalne. Aplikacja nie ma analityki ani zapisu transkryptu terminala.

Opcjonalny pad obsługuje wskaźnik, kliknięcie i przeciąganie, przewijanie oraz Ustawienia/Wstecz. Możesz nadal korzystać z myszy i klawiatury.

## Stan

**Eksperymentalne wydanie źródłowe 0.4.1-alpha.1.** Dodaje sterowanie padem Xbox Bluetooth. Próby tego kodu na Samsung QE50Q67BAUXXH / Tizen 6.5 potwierdziły ruch wskaźnika i Menu/Ustawienia → B/Wstecz. Kliknięcie/przeciąganie, skalowanie kursora w modalach, przewijanie, współpraca z myszą oraz usuwanie podwójnych zdarzeń mają pokrycie w testach przeglądarkowych. Łączny test pada przy czterech aktywnych SSH odłożono; pełny odbiór cyklu życia, długotrwałej pracy i innych modeli pozostaje otwarty. Starsza wersja 0.3.3 miała potwierdzone cztery powłoki i fizyczny wybór panelu klawiszem Super. [Ograniczenia](docs/COMPATIBILITY.md).

## Uruchomienie

Zainstaluj oficjalne narzędzia Samsunga, utwórz profil certyfikatów dla własnego TV, zbuduj i podpisz pakiet według [BUILD.md](docs/BUILD.md). Repozytorium nie zawiera naszego pakietu podpisanego dla urządzenia, kluczy, certyfikatów ani konfiguracji serwera.

W aplikacji podaj własny host, port, użytkownika bez uprawnień administratora i niezależnie zweryfikowany odcisk klucza hosta. `tvuser` jest wyłącznie neutralną wartością początkową. Wygeneruj cztery klucze na TV i dodaj ich części publiczne do właściwego konta na serwerze. **Połącz 4** pyta o hasło ochronne raz dla bieżącej grupy połączeń; aplikacja go nie zapisuje.

Pierwszy autor: **Piotr Adamski (piotr-adamski)**. Kod własny udostępniamy na **Apache-2.0**. Zachowaj LICENSE, NOTICE, AUTHORS.md i właściwe informacje o zależnościach. [Łańcuch komponentów i autorstwa](THIRD_PARTY_NOTICES.md).
