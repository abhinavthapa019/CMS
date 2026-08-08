Centralizes workflows such as student and teacher management, attendance, fee collection, 
notices, assignment submissions and final grade prediction into a single platform  
● Final year project, followed SDLC development phase along with complete documentation 
● Implemented concepts of RBAC, layered architecture, file management and machine 
learning 
● Used dataset from Kaggle for final grade prediction with Random Forest Algorithm 
achieving R² = 0.858 and MAE = 4.5, explaining 85.8% of variance with an average 
prediction error of ~4.5 percentage points. 


cd ml-services
.\.venv\Scripts\Activate.ps1
uvicorn app:app --host 0.0.0.0 --port 8000 // for starting up the files
