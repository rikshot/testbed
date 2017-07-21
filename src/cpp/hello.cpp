extern "C" {
	unsigned long long factorial(unsigned long long const n) {
		if(n < 2) return n;
		return factorial(n - 2) + factorial(n - 1);
	}
}