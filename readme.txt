1. Open terminal
2. cd Desktop/script (or whatever path you want to put this folder)
3. npm i (if installing for the first time)
4. npm run dev
5. Open http://localhost:7000 in browser
6. ctrl + c to stop
7. If port in use error try: lsof -i tcp:7000 (to get the PID) kill -9 PID (replace PID with number from the previous command to kill the sucker)
8. If for some reason the app crashes, or browser timeouts, or pc goes to sleep etc. Re-upload the results.csv file. It will contain the data before the crash and skip the completed items
9. Kill port on Win netstat -ano | findstr :7000; taskkill /PID <PID> /F
10. You can change port in .env file
