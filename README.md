#GamblaCoin

*Gamblacoin* is a provably fair dice gaming site using Bitcoin as the main currency.
The gambler bets an amount of bitcoin and choose a multiplier, let's say 1 bitcoin and a multiplier of 4. The house then generates a random number between 0 and 100, if the number is below 25, the gambler wins 4 bitcoin, otherwise he loses the initial bet. The odd is winning is rougly below 1 out of 4. Now if the gambler choose a mutiplier of 10, any number below 10 would make a win, the odd would be below 1 out of 10.
Higher multiplier implies lower chance to win and vice and versa. 

The user can independently verify that the bet was fair using cryptography. Before a new hand, the house gives to the gambler a cryptographic hash of the upcoming number, and he can use this information to verify after hand that the house hasn't cheat by changing the number to see.

Built with *nodejs* and *mongodb* on the backend, *backbone* and *bootstrap* on the frontend. Also include *socket.io* for real time notifications.
Tested with *mocha*

> Running and operaring this gaming web application is prohibited in almost any countries without a proper gaming license.
