FROM python:alpine

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py script.js README.md ./

EXPOSE 8051

CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:8051", "app:app"]
